
export const mockSendEmail = (to: string, subject: string, body: string) => {
    console.log(`\n--- [MOCK EMAIL SENT] ---`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${body}`);
    console.log(`-------------------------\n`);
};

export const mockSendSMS = (phoneNumber: string, message: string) => {
    console.log(`\n+++ [MOCK SMS SENT] +++`);
    console.log(`To: ${phoneNumber}`);
    console.log(`Message: ${message}`);
    console.log(`++++++++++++++++++++++++\n`);
};

export const sendRegistrationNotification = (user: { name: string, email: string, phoneNumber?: string, notificationPreference?: 'email' | 'sms' }) => {
    const message = `Hello ${user.name}, thank you for registering with us!`;

    if (user.notificationPreference === 'sms' && user.phoneNumber) {
        mockSendSMS(user.phoneNumber, message);
    } else {
        // Default to email
        mockSendEmail(user.email, "Welcome!", message);
    }
};

export const sendCreditNotification = (user: { name: string, email: string, phoneNumber?: string, notificationPreference?: 'email' | 'sms' }, amount: number) => {
    const message = `Hello ${user.name}, you have received Rs. ${amount} as a referral reward! Your new wallet balance has been updated.`;

    if (user.notificationPreference === 'sms' && user.phoneNumber) {
        mockSendSMS(user.phoneNumber, message);
    } else {
        // Default to email
        mockSendEmail(user.email, "Referral Reward Credited!", message);
    }
};

export const sendOrderConfirmationNotification = (user: { name: string, email: string, phoneNumber?: string, notificationPreference?: 'email' | 'sms' }, transactionId: string, amount: number) => {
    const message = `Hello ${user.name}, your order #${transactionId} has been confirmed for Rs. ${amount}. Thank you for shopping with us!`;

    if (user.notificationPreference === 'sms' && user.phoneNumber) {
        mockSendSMS(user.phoneNumber, message);
    } else {
        // Default to email
        mockSendEmail(user.email, "Order Confirmation", message);
    }
};
