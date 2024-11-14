
const {sendResponse} = require('../responses/index');


const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

let nanoid;
(async () => {
  const module = await import('nanoid');
  nanoid = module.nanoid;
})();


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
    
    const { checkInDate, checkOutDate, guests, name, email, rooms } = body;

    // validate roomcapacity
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

    // calculate night and cost
    const nights = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
    const totalCost = rooms.reduce((sum, room) => {
        const [roomType] = room.split('-');
        return sum + (roomPrices[roomType] * nights);
    }, 0);

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
        totalCost
    };

    await db.put({
        TableName: 'hotel-db',
        Item: booking
    }).promise()

    // confirmation after booking
    const confirmation = {
        bookingID: booking.id,
        guests: booking.guests,
        roomCount: rooms.length,
        totalCost: booking.totalCost,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        guestName: booking.name
    };



    return sendResponse(200, { message: "Booking confirmed", confirmation: confirmation });
};



//body ser ut så här: {"name": "jonas Bondesson",
// "email" : "jonas.bondesson@yahoo.com",
// "checkInDate": "21.01.22",
// "checkOutDate": "21.01.22",
// "guests": 5,
// "rooms": ["suite-1", "double-1"]
// }