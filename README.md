<!--
title: 'AWS Simple HTTP Endpoint example in NodeJS'
description: 'This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.'
layout: Doc
framework: v4
platform: AWS
language: nodeJS
authorLink: 'https://github.com/serverless'
authorName: 'Serverless, Inc.'
authorAvatar: 'https://avatars1.githubusercontent.com/u/13742415?s=200&v=4'
-->

# Serverless Framework Node HTTP API on AWS

This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.

This template does not include any kind of persistence (database). For more advanced examples, check out the [serverless/examples repository](https://github.com/serverless/examples/) which includes Typescript, Mongo, DynamoDB and other examples.

## Usage

### Deployment

In order to deploy the example, you need to run the following command:

```
serverless deploy
```

After running deploy, you should see output similar to:

```
Deploying "serverless-http-api" to stage "dev" (us-east-1)

✔ Service deployed to stack serverless-http-api-dev (91s)

endpoint: GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
functions:
  hello: serverless-http-api-dev-hello (1.6 kB)
```

_Note_: In current form, after deployment, your API is public and can be invoked by anyone. For production deployments, you might want to configure an authorizer. For details on how to do that, refer to [HTTP API (API Gateway V2) event docs](https://www.serverless.com/framework/docs/providers/aws/events/http-api).

### Invocation

After successful deployment, you can call the created application via HTTP:

```
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/
```

Which should result in response similar to:

```json
{ "message": "Go Serverless v4! Your function executed successfully!" }
```

### Local development

The easiest way to develop and test your function is to use the `dev` command:

```
serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.


# MA23_Backend_hotel API

This project is a serverless hotel booking API built using AWS Lambda, DynamoDB, and API Gateway.

## Endpoints

### confirmBooking Endpoint

The confirmBooking endpoint retrieves a booking confirmation based on a provided bookingID.
	•	Method: GET
	•	Path: /booking/confirm
	•	Query Parameter:
	•	bookingID (required): The unique ID of the booking to confirm.
 

### bookings Endpoint

The bookings endpoint retrieves a list of all bookings to provide an overview of hotel occupancy.
	•	Method: GET
	•	Path: /bookings


## Functionality

### confirmBooking:
	•	If bookingID is provided: Returns a confirmation with booking details, including guest count, room count, total cost, check-in and check-out dates, and guest name.
	•	If bookingID is missing: Returns an error indicating the ID is required.
	•	Error Handling: Responds with a general error message if an internal error occurs.

### bookings:
	•	Returns a list of all bookings with details including booking ID, check-in and check-out dates, guest count, room count, and guest name.
	•	Error Handling: Responds with a general error message if an internal error occurs.
