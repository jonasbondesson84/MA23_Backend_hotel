const AWS = require('aws-sdk');
const db = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event, context) => {

    const rooms = [
        "single","single","single","single","single","single","single",
        "double","double","double","double","double","double","double",
        "suite","suite","suite","suite","suite","suite"
    ];

    const roomPromises = rooms.map((room, index) => {
        return db.put({
            TableName: 'rooms-db',
            Item: {
                id: `room-${index + 1}`,
                type: room,
                bookings: []
            }
        }).promise();
    });

    await Promise.all(roomPromises);
    
    return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Rooms added successfully' })
    };
};