
const {sendResponse} = require('../responses/index');


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

            // Kontrollera alla bokningar för att se om någon överlappar med den nya perioden
            for (const booking of room.bookings) {
                const existingCheckIn = new Date(booking.checkInDate);
                const existingCheckOut = new Date(booking.checkOutDate);

                const checkInDate = new Date(checkIn);
                const checkOutDate= new Date(checkOut);
                // Om någon bokning överlappar, välj inte detta rum
                if ((checkInDate >= existingCheckIn && checkInDate <= existingCheckOut) || 
                    (checkOutDate >= existingCheckIn && checkOutDate <= existingCheckOut) || 
                    (checkInDate <= existingCheckIn && checkOutDate >= existingCheckOut)
                    ) {
                        return false;
                    } 
            }
            return true
        }) 

        return availableRooms;
    } catch (error) {
        console.error('Error fetching rooms by type:', error);
        throw error;
    }
};

const checkRooms = async (rooms) => {

    const selectedRooms = [];
    const promises = rooms.map(async (room) => {
        try {
            const roomsOfType = await getRoomsByType(room);
            if (roomsOfType && roomsOfType.length > 0) {
                selectedRooms.push(roomsOfType[0]);
                
            } else {
                console.error("No rooms found for type:", room);
            }
        } catch (error) {
            console.error("Error processing room:", error);
        }
    });

    await Promise.all(promises);

   

    return selectedRooms;

    
};

const addRoomBooking = async (id, bookingID, checkInDate, checkOutDate) => {
    const newBooking = {id: bookingID, checkInDate: checkInDate, checkOutDate: checkOutDate};
    
    const params = {
        TableName: 'rooms-db',
        Key: { id }, 
        UpdateExpression: 'SET bookings = list_append(bookings, :newBooking)',
        ExpressionAttributeValues: {
            ':newBooking': [newBooking] 
        },
        ReturnValues: 'UPDATED_NEW' 
    };
    try {
        const result = await db.update(params).promise();
        console.log('Update result:', result);
        return result;
    } catch (error) {
        console.error('Error adding guest to room:', error);
        throw error;
    }

}

const addBooking = async (selectedRooms, body) => {
    const { checkInDate, checkOutDate, guests, name, email, rooms ,bookedRoomsID} = body;
    if(selectedRooms.length === rooms.length) {
        const bookedRoomsID = [];
        for(const room of selectedRooms) {
            try {
                const bookingID = nanoid();
                //add booking to rooms
                const bookedRoom = await addRoomBooking(room.id, bookingID, checkInDate, checkOutDate);
                bookedRoomsID.push(bookingID);
                } catch (error) {
                    console.error("Error fetching rooms by type:", error);
                    return sendResponse(501, { message: "Internal server error: " + error });
                }
        }
        // generate bookingID and create bookingobject
        const bookingID = nanoid();
        const booking = {
            id: bookingID,
            name,
            email,
            checkInDate,
            checkOutDate,
            guests,
            rooms,
            bookedRoomsID
        };
        //add booking
        await db.put({
            TableName: 'hotel-db',
            Item: booking
        }).promise()

        return sendResponse(200, {message: "booking succed"})
    }
}




exports.handler = async (event, context) => {
    if (!nanoid) {
        const module = await import('nanoid');
        nanoid = module.nanoid;
      }
    const body = JSON.parse(event.body);
    const requiredParameters = ["checkInDate", "checkOutDate", "guests", "name", "email", "rooms"];
    const missingParameters = requiredParameters.filter(param => !(param in body));
    if(Object.keys(body).length < 6 || missingParameters.length > 0) {
        return sendResponse(400, {message: "error in body"})
    } 
    
    const { checkInDate, checkOutDate, guests, name, email, rooms ,bookedRoomsID} = body;

    // validate roomcapacity
    const roomCapacity = {
        "single": 1,
        "double": 2,
        "suite": 3
    };

    const roomsArray = Array.isArray(rooms) ? rooms : rooms[0].split(', ').map(room => room.trim());
    const totalCapacity = roomsArray.reduce((sum, room) => {
        const [roomType] = room.split('-');
        return sum + (roomCapacity[roomType.toLowerCase()] || 0);
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

    
    const selectedRooms = await checkRooms(rooms, checkInDate, checkOutDate);


    return addBooking(selectedRooms, body); 

};





//body ser ut så här: {"name": "jonas Bondesson",
// "email" : "jonas.bondesson@yahoo.com",
// "checkInDate": "21-01-22",
// "checkOutDate": "21-01-22",
// "guests": 5,
// "rooms": ["suite-1", "double-1"]
// }