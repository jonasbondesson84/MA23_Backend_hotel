
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

    
    const checkInDate = body.checkInDate;
    const checkOutDate = body.checkOutDate;
    const guests = body.guests;
    const orderName = body.name;
    const orderEmail = body.email;
    const rooms = body.rooms;

    const bookingID = nanoid();
    
    let booking = {id : bookingID,
        name: orderName,
        email: orderEmail,
        checkInDate: checkInDate,
        checkOutDate: checkOutDate,
        guests: guests,
        rooms: rooms
    };

    await db.put({
        TableName: 'hotel-db',
        Item: booking
    }).promise()


    return sendResponse(200, {booking: booking});


}



//body ser ut så här: {"name": "jonas Bondesson",
// "email" : "jonas.bondesson@yahoo.com",
// "checkInDate": "21.01.22",
// "checkOutDate": "21.01.22",
// "guests": 5,
// "rooms": ["svit-1, dubbel-1"]
// }