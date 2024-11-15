
const {sendResponse} = require('../responses/index');

const moment = require('moment');
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
        console.log('Rooms of type:', roomType, result.Items);
        

        const availableRooms = result.Items.filter(room => {
            // Om det inte finns bokningar för rummet, så är det tillgängligt
            if (!room.bookings || room.bookings.length === 0) {
                return true;
            }

            // Checks all bookings to see if any overlaps
            for (const booking of room.bookings) {
                const existingCheckIn = new Date(booking.checkInDate);
                const existingCheckOut = new Date(booking.checkOutDate);
            
                const checkInDate = new Date(checkIn);
                const checkOutDate= new Date(checkOut);
                
                // if overlaps, dont choose this room
                if ((checkInDate >= existingCheckIn && checkInDate <= existingCheckOut) || 
                    (checkOutDate >= existingCheckIn && checkOutDate <= existingCheckOut) || 
                    (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
                    ) {
                        return false;
                    } 
            }
            return false
        }) 

        return availableRooms;
    } catch (error) {
        console.error('Error fetching rooms by type:', error);
        throw error;
    }
};

const checkRooms = async (rooms, checkInDate, checkOutDate) => {
    const availableRooms = [];
    for (var room of rooms) {
        room = room.toLowerCase()
        if (availableRooms.length >= rooms.length) break; 

        try {
            const roomsOfType = await getRoomsByType(room, checkInDate, checkOutDate);
            if (roomsOfType && roomsOfType.length > 0) {
                for (room of roomsOfType) {
                    if (!(availableRooms.some(e => e.id === room.id))) {
                        availableRooms.push(room);
                        break;
                    }
                }
                
            } else {
                console.log(`No available rooms found for type: ${room}`);
            }
        } catch (error) {
            console.error("Error processing room:", error);
        }
    }
    
    return availableRooms;
};

const addRoomBooking = async (id, bookingID, checkInDate, checkOutDate) => {
    const newBooking = { id: bookingID, checkInDate, checkOutDate };

    const getParams = {
        TableName: 'rooms-db',
        Key: { id }
    };

    try {
        // const roomData = await db.get(getParams).promise();

        // // If room doesn't exist, log and return null
        // if (!roomData.Item) {
        //     console.log(`Room ${id} not found`);
        //     return null;
        // }

        // const existingBookings = roomData.Item.bookings || [];

        // // Check for overlaps
        // const hasOverlap = existingBookings.some(booking => {
        //     const existingCheckIn = new Date(booking.checkInDate);
        //     const existingCheckOut = new Date(booking.checkOutDate);
        //     const newCheckIn = new Date(checkInDate);
        //     const newCheckOut = new Date(checkOutDate);

        //     return (newCheckIn < existingCheckOut && newCheckOut > existingCheckIn) ||
        //            (newCheckIn <= existingCheckIn && newCheckOut >= existingCheckOut);
        // });

        // if (hasOverlap) {
        //     console.log(`Room ${id} is already booked for the requested dates.`);
        //     return null; 
        // }

        // Proceed with booking the room if no overlap
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
        console.log('No rooms available at all.');
        return { success: false, message: 'No rooms available for booking' }; 
    }

    console.log('Initial unbooked rooms:', unbookedRooms); 

    // Go through all available rooms and attempt to book
    for (const room of availableRooms) {
        if (bookedRooms.length === requiredRoomCount) break; // Stop once enough rooms are booked

        try {
            const bookingID = nanoid();
            const bookedRoom = await addRoomBooking(room.id, bookingID, checkInDate, checkOutDate);

            if (bookedRoom) {
                bookedRooms.push({ roomID: room.id, roomType: room.type, bookingID });
                console.log(`Room ${room.id} (${room.type}) successfully booked.`);

                // Log unbooked rooms before mutation
                console.log('Unbooked rooms before removal:', unbookedRooms);

                // Remove the successfully booked room's type from unbookedRooms (case-insensitive comparison)
                const roomType = room.type.toLowerCase(); 
                const roomIndex = unbookedRooms.findIndex(r => r.toLowerCase() === roomType); 
                if (roomIndex !== -1) {
                    unbookedRooms.splice(roomIndex, 1); // Remove the room type from unbookedRooms
                    console.log(`Room type ${roomType} removed from unbookedRooms.`);
                } else {
                    console.log(`Room type ${roomType} not found in unbookedRooms.`);
                }

                // Log unbooked rooms after mutation
                console.log('Unbooked rooms after removal:', unbookedRooms);
            } else {
                console.log(`Room ${room.id} could not be booked. Keeping in unbookedRooms.`);
            }
        } catch (error) {
            console.error(`Error booking room ${room.id}:`, error);
            return { success: false, message: "Internal server error: " + error };
        }
    }

    // Log the final state of unbookedRooms
    console.log('Final unbooked rooms:', unbookedRooms);

    let confirmation = {};
    let message = '';
    let statusCode = 200;

    if (bookedRooms.length === 0) {
        confirmation = { confirmationID: nanoid() };
        message = "No rooms available for the selected dates.";
        statusCode = 200; // No booking done, but request processed
    } else {
        const overallBookingID = nanoid();
        const booking = {
            id: overallBookingID,
            name,
            email,
            checkInDate,
            checkOutDate,
            guests,
            rooms: bookedRooms.map(room => room.roomID),
            // rooms:  bookedRooms.map(room => ({
            //     roomID: room.roomID,
            //     roomType: room.roomType,
            //     bookingID: room.bookingID
            // })),
            bookedRoomsID: bookedRooms.map(room => room.bookingID)
        };

        try {
            await db.put({
                TableName: 'hotel-db',
                Item: booking
            }).promise();
            console.log('Booking added to hotel-db successfully:', booking);
        } catch (error) {
            console.error('Error adding booking to hotel-db:', error);
            return { success: false, message: "Internal server error when saving booking" };
        }

        confirmation = {
            bookingID: overallBookingID,
            bookedRoomCount: bookedRooms.length,
            bookedRooms: bookedRooms.map(room => ({
                roomID: room.roomID,
                roomType: room.roomType,
                bookingID: room.bookingID
            })),
            unbookedRooms: unbookedRooms,
            checkInDate,
            checkOutDate,
            guestName: name
        };
        message = "Booking confirmed";
    }

    return { success: true, confirmation, message };
};

exports.handler = async (event, context) => {
    if (!nanoid) {
        const module = await import('nanoid');
        nanoid = module.nanoid;
    }
    const body = JSON.parse(event.body);
    const requiredParameters = ["checkInDate", "checkOutDate", "guests", "name", "email", "rooms"];
    const missingParameters = requiredParameters.filter(param => !(param in body));
    if (Object.keys(body).length < 6 || missingParameters.length > 0) {
        return sendResponse(400, { message: "Error in body" });
    }

    const { checkInDate, checkOutDate, guests, name, email, rooms, bookedRoomsID } = body;

    // Validate room capacity
    const roomCapacity = { "single": 1, "double": 2, "suite": 3 };
    const roomPrices = { "single": 500, "double": 1000, "suite": 1500 };

    const totalCapacity = rooms.reduce((sum, room) => {
        const [roomType] = room.split('-');
        return sum + (roomCapacity[roomType] || 0);
    }, 0);

    if (totalCapacity < guests) {
        return sendResponse(400, { message: "Room capacity does not match the number of guests" });
    }

    // Validate date
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);
    if (checkOut <= checkIn) {
        return sendResponse(400, { message: "Check-out date must be after check-in date" });
    }


    // Calculate night and cost
    const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
    const totalCost = rooms.reduce((sum, room) => {
        const [roomType] = room.split('-');
        return sum + (roomPrices[roomType] * nights);
    }, 0);
    //get available rooms
    const selectedRooms = await checkRooms(rooms, checkInDate, checkOutDate);

    //makes a booking
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