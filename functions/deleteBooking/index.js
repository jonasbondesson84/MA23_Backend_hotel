const { DynamoDBClient, GetItemCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');
const moment = require('moment');
const { sendResponse } = require('../responses/index');

exports.handler = async (event) => {
  const { id } = event.pathParameters;  // Hämtar ID från pathParameters i API Gateway
  const tableName = '${env:RESOURCES_TABLENAME}';   
  

  try {
    // gets information from DynamoDB
    const getItemParams = {
      TableName: tableName,
      Key: {
        'booking_id': { S: id },  // use booking id that you want to delete
      },
    };

    const data = await dynamoDBClient.send(new GetItemCommand(getItemParams));

    if (!data.Item) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Booking not found' }),
      };
    }

    // checks if cancellation is valid within two days
    const checkinDate = moment(data.Item.checkin_date.S); 
    const today = moment();
    const diffInDays = checkinDate.diff(today, 'days');

    if (diffInDays < 2) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'You cannot cancel your booking less than two days before check-in.',
        }),
      };
    }

    // deletes booking, according to cancellation policy
    const deleteItemParams = {
      TableName: tableName,
      Key: {
        'booking_id': { S: id },
      },
    };

    await dynamoDBClient.send(new DeleteItemCommand(deleteItemParams));

    // confirmation message of cancellation
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: `Booking with ID ${id} has been successfully cancelled.`,
      }),
    };
  } catch (error) {
    console.error('Error occurred:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
      }),
    };
  }
};
