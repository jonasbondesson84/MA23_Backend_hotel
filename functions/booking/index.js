const { sendResponse } = require('../responses/index');
const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

let nanoid;
(async () => {
  const module = await import('nanoid');
  nanoid = module.nanoid;
})();

const getRoomsByType = async (roomType, checkIn, checkOut) => {
  const params = {
    TableName: 'rooms-db',
    FilterExpression: '#typeAttr = :roomType',
    ExpressionAttributeNames: {
      '#typeAttr': 'type'
    },
    ExpressionAttributeValues: {
      ':roomType': roomType
    }
  };

  try {
    const result = await db.scan(params).promise();
    const availableRooms = result.Items.filter(room => {
      if (!room.bookings || room.bookings.length === 0) {
        return true;
      }

      for (const booking of room.bookings) {
        const existingCheckIn = new Date(booking.checkInDate);
        const existingCheckOut = new Date(booking.checkOutDate);
        const checkInDate = new Date(checkIn);
        const checkOutDate = new Date(checkOut);

        if (
          (checkInDate >= existingCheckIn && checkInDate <= existingCheckOut) ||
          (checkOutDate >= existingCheckIn && checkOutDate <= existingCheckOut) ||
          (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
        ) {
          return false;
        }
      }
      return true;
    });

    return availableRooms;
  } catch (error) {
    console.error('Error fetching rooms by type:', error);
    throw error;
  }
};

const checkRooms = async (rooms, checkInDate, checkOutDate) => {
  const availableRooms = [];
  for (let room of rooms) {
    room = room.toLowerCase();
    if (availableRooms.length >= rooms.length) break;

    try {
      const roomsOfType = await getRoomsByType(room, checkInDate, checkOutDate);
      if (roomsOfType && roomsOfType.length > 0) {
        availableRooms.push(...roomsOfType.slice(0, rooms.length - availableRooms.length));
      } else {
        console.log(`No available rooms found for type: ${room}`);
      }
    } catch (error) {
      console.error('Error processing room:', error);
    }
  }
  return availableRooms;
};

const addRoomBooking = async (id, bookingID, checkInDate, checkOutDate, guestName) => {
    const newBooking = { 
        guestName, 
        checkInDate, 
        checkOutDate, 
        id: bookingID 
    };
    

  const getParams = {
    TableName: 'rooms-db',
    Key: { id }
  };

  try {
    const roomData = await db.get(getParams).promise();
    if (!roomData.Item) {
      console.log(`Room ${id} not found`);
      return null;
    }

    const existingBookings = roomData.Item.bookings || [];
    const hasOverlap = existingBookings.some(booking => {
      const existingCheckIn = new Date(booking.checkInDate);
      const existingCheckOut = new Date(booking.checkOutDate);
      const newCheckIn = new Date(checkInDate);
      const newCheckOut = new Date(checkOutDate);

      return (
        (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) ||
        (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut)
      );
    });

    if (hasOverlap) {
      console.log(`Room ${id} is already booked for the requested dates.`);
      return null;
    }

    const updateParams = {
      TableName: 'rooms-db',
      Key: { id },
      UpdateExpression: 'SET bookings = list_append(if_not_exists(bookings, :emptyList), :newBooking)',
      ExpressionAttributeValues: {
        ':newBooking': [newBooking],
        ':emptyList': []
      },
      ReturnValues: 'UPDATED_NEW'
    };

    const result = await db.update(updateParams).promise();
    console.log('Booking added successfully:', result);
    return result;

  } catch (error) {
    console.error('Error adding booking:', error);
    return null;
  }
};

const addBooking = async (availableRooms, body) => {
  const { checkInDate, checkOutDate, guests, name, email, rooms } = body;
  const requiredRoomCount = rooms.length;
  const bookedRooms = [];
  const unbookedRooms = rooms.map(room => room.toLowerCase());

  if (availableRooms.length === 0) {
    return { success: false, message: 'No rooms available for booking' };
  }

  for (const room of availableRooms) {
    if (bookedRooms.length === requiredRoomCount) break;

    try {
      const bookingID = nanoid();
      const bookedRoom = await addRoomBooking(room.id, bookingID, checkInDate, checkOutDate, name);

      if (bookedRoom) {
        bookedRooms.push({ roomID: room.id, roomType: room.type, bookingID });
        const roomType = room.type.toLowerCase();
        const roomIndex = unbookedRooms.findIndex(r => r.toLowerCase() === roomType);
        if (roomIndex !== -1) {
          unbookedRooms.splice(roomIndex, 1);
        }
      }
    } catch (error) {
      console.error(`Error booking room ${room.id}:`, error);
      return { success: false, message: 'Internal server error: ' + error };
    }
  }

  if (bookedRooms.length === 0) {
    return { success: false, message: 'No rooms available for the selected dates.' };
  }

  const overallBookingID = nanoid();
  const booking = {
    id: overallBookingID,
    name,
    email,
    checkInDate,
    checkOutDate,
    guests,
    rooms: bookedRooms.map(room => room.roomID),
    bookedRoomsID: bookedRooms.map(room => room.bookingID)
  };

  try {
    await db.put({
      TableName: 'hotel-db',
      Item: booking
    }).promise();
  } catch (error) {
    console.error('Error adding booking to hotel-db:', error);
    return { success: false, message: 'Internal server error when saving booking' };
  }

  return {
    success: true,
    confirmation: {
      bookingID: overallBookingID,
      bookedRoomCount: bookedRooms.length,
      bookedRooms: bookedRooms.map(room => ({
        roomID: room.roomID,
        roomType: room.roomType,
        bookingID: room.bookingID
      })),
      unbookedRooms,
      checkInDate,
      checkOutDate,
      guestName: name
    },
    message: 'Booking confirmed'
  };
};

exports.handler = async (event) => {
  if (!nanoid) {
    const module = await import('nanoid');
    nanoid = module.nanoid;
  }
  const body = JSON.parse(event.body);
  const requiredParameters = ['checkInDate', 'checkOutDate', 'guests', 'name', 'email', 'rooms'];
  const missingParameters = requiredParameters.filter(param => !(param in body));
  if (Object.keys(body).length < 6 || missingParameters.length > 0) {
    return sendResponse(400, { message: 'Error in body' });
  }

  const { checkInDate, checkOutDate, guests, name, email, rooms } = body;

  const roomCapacity = { single: 1, double: 2, suite: 3 };
  const totalCapacity = rooms.reduce((sum, room) => {
    const [roomType] = room.split('-');
    return sum + (roomCapacity[roomType] || 0);
  }, 0);

  if (totalCapacity < guests) {
    return sendResponse(400, { message: 'Room capacity does not match the number of guests' });
  }

  const checkIn = new Date(checkInDate);
  const checkOut = new Date(checkOutDate);
  if (checkOut <= checkIn) {
    return sendResponse(400, { message: 'Check-out date must be after check-in date' });
  }

  const selectedRooms = await checkRooms(rooms, checkInDate, checkOutDate);

  const booking = await addBooking(selectedRooms, body);

  if (!booking.success) {
    return sendResponse(500, { message: booking.message });
  }

  return sendResponse(200, {
    message: booking.message,
    confirmation: booking.confirmation
  });
};

//body ser ut så här: {"name": "jonas Bondesson",
// "email" : "jonas.bondesson@yahoo.com",
// "checkInDate": "21-01-22",
// "checkOutDate": "21-01-22",
// "guests": 5,
// "rooms": ["suite", "double"]
// }