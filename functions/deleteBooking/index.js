const { DynamoDBClient, GetItemCommand, DeleteItemCommand, UpdateItemCommand } = require('@aws-sdk/client-dynamodb');
const { sendResponse } = require('../responses/index');

const dynamoDBClient = new DynamoDBClient();

exports.handler = async (event) => {
    const { id } = event.pathParameters;  // Hämtar bookingID från pathParameters i API Gateway
    const tableName = process.env.RESOURCES_TABLENAME;

    try {
        // Hämta bokningsdetaljer från hotel-db för att få kopplade rum
        const getItemParams = {
            TableName: tableName,
            Key: {
                'id': { S: id },
            },
        };

        const bookingData = await dynamoDBClient.send(new GetItemCommand(getItemParams));

        if (!bookingData.Item) {
            return sendResponse(404, { message: 'Booking not found' });
        }

        const bookedRoomsIDs = bookingData.Item.rooms.L.map(room => room.S);
        console.log(bookedRoomsIDs);

        // Radera bokningen från hotel-db
        const deleteItemParams = {
            TableName: tableName,
            Key: {
                'id': { S: id },
            },
        };
        await dynamoDBClient.send(new DeleteItemCommand(deleteItemParams));

        // Uppdatera varje rum i rooms-db för att ta bort alla bokningsposter i "bookings"-fältet
        for (const roomID of bookedRoomsIDs) {
            const updateParams = {
                TableName: 'rooms-db',
                Key: { id: { S: roomID } },
                UpdateExpression: 'REMOVE bookings' // Tar bort hela "bookings"-fältet
            };
            await dynamoDBClient.send(new UpdateItemCommand(updateParams));
        }

        // Bekräftelsemeddelande
        return sendResponse(200, {
            message: `Booking with ID ${id} and associated room bookings have been successfully cancelled.`,
        });
    } catch (error) {
        console.error('Error occurred:', error);
        return sendResponse(500, {
            message: 'Internal server error',
            error: error.message,
        });
    }
};