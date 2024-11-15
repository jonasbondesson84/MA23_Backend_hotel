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

Link to api: https://mqlof953xi.execute-api.eu-north-1.amazonaws.com

# MA23_Backend_hotel API

This project is a serverless hotel booking API built using AWS Lambda, DynamoDB, and API Gateway.

## Endpoints

### booking Endpoint

The booking endpoint add booking to database.
	•	Method: POST
	•	Path: /booking
	•	Query Parameter:
	•	body: {"name": "jonas Bondesson",
			"email" : "test@test.com",
	 		"checkInDate": "2021/01/22",
 			"checkOutDate": "2021/01/23",
 			"guests": 5,
 			"rooms": ["suite", "double"]
 		}

### confirmBooking Endpoint

The confirmBooking endpoint retrieves a booking confirmation based on a provided bookingID.
	•	Method: GET
	•	Path: /booking/confirm
	•	Query Parameter:
	•	bookingID (required): The unique ID of the booking to confirm.

 ### deleteBooking Endpoint

The bookings endpoint deletes booking by its unique ID. Enter ID number.
	•	Method: DELETE
	•	Path: /bookings
 

### bookings Endpoint

The bookings endpoint retrieves a list of all bookings to provide an overview of hotel occupancy.
	•	Method: GET
	•	Path: /bookings


## Functionality

### booking
	•	If not enough parameters in body, or required is not in body: Returns an error indicating body is not correct.
	•	If room capacity is not enough based on guest: Returns an error indicating rooms is not enough
 	•	If checkInDate is after checkOutDate: Returns an error indicating date-error
  	•	If body is provided: Checks if there are rooms available:
   			•	If not: Returns an error
      		•	Else: Reservs the rooms in rooms-db and adds a booking in hotel-db, 
	 returns a confirmation of the booking, including bookingID, guest count, room count, total cost, check-in and check-out dates, and guest name
	

### confirmBooking:
	•	If bookingID is provided: Returns a confirmation with booking details, including guest count, room count, total cost, check-in and check-out dates, and guest name.
	•	If bookingID is missing: Returns an error indicating the ID is required.
	•	Error Handling: Responds with a general error message if an internal error occurs.

 ### deleteBooking
 	•	If bookingID is provided and cancelled within 2 days before arrival: Returns a cancellation confirmation
  	•	If bookingID is provided and cancdlled later than 2 days before arrival: Returns message refering to cancellation policy
   	•	If bookingID is : Returns an error indicating the there is no booking in mentioned ID.	
	•	Error Handling: Responds with a general error message if an internal error occurs.

### bookings:
	•	Returns a list of all bookings with details including booking ID, check-in and check-out dates, guest count, room count, and guest name.
	•	Error Handling: Responds with a general error message if an internal error occurs.
