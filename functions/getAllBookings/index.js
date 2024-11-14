const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();
const { sendResponse } = require('../responses/index');

exports.handler = async (event) => {
    try {
        const params = {
            TableName: process.env.RESOURCES_TABLENAME,
        };

        const data = await db.scan(params).promise();
        
        const bookings = data.Items.map(item => ({
            bookingID: item.id,
            checkInDate: item.checkInDate,
            checkOutDate: item.checkOutDate,
            guests: item.guests,
            roomCount: item.rooms.length,
            guestName: item.name
        }));

        return sendResponse(200, { bookings });
    } catch (error) {
        return sendResponse(500, { message: 'Internal Server Error', error: error.message });
    }
};