const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

module.exports.handler = async (event) => {
    try {
        
        const bookingID = event.queryStringParameters ? event.queryStringParameters.bookingID : null;

        if (!bookingID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'BookingID is required' }),
            };
        }

        // get booking from dynamodb
        const result = await db.get({
            TableName: 'hotel-db',
            Key: { id: bookingID }
        }).promise();

        const booking = result.Item;

        // control booking exist
        if (!booking) {
            return {
                statusCode: 404,
                body: JSON.stringify({ message: 'Booking not found' }),
            };
        }

        // create confirmation from database
        const confirmation = {
            bookingID: booking.id,
            guests: booking.guests,
            roomCount: booking.rooms.length,
            totalCost: booking.totalCost,
            checkInDate: booking.checkInDate,
            checkOutDate: booking.checkOutDate,
            guestName: booking.name,
        };

        return {
            statusCode: 200,
            body: JSON.stringify({ message: 'Booking confirmation', confirmation }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
        };
    }
};