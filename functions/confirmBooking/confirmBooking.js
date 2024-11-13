module.exports.handler = async (event) => {
    try {
        // Kontrollera om queryStringParameters innehåller bookingID
        const bookingID = event.queryStringParameters ? event.queryStringParameters.bookingID : null;

        if (!bookingID) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'BookingID is required' }),
            };
        }

        // Simulerad bokningsdata, används här som mock-data för test
        const booking = {
            bookingID: bookingID,
            guests: 2,
            roomCount: 1,
            totalCost: 2000,
            checkInDate: "2024-12-01",
            checkOutDate: "2024-12-05",
            name: "Frida Dahlqvist",
        };

        // Skapa en bekräftelse med bokningsinformation
        const confirmation = {
            bookingID: booking.bookingID,
            guests: booking.guests,
            roomCount: booking.roomCount,
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