import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import twilio from 'twilio';

export const sendSMS = async (req: AuthRequest, res: Response) => {
  const { to, message } = req.body;

  if (!to || !message) {
    return res.status(400).json({ message: 'Please provide both to and message fields' });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    console.log(`[SMS MOCK] To: ${to} | Message: ${message}`);
    return res.status(200).json({ 
      success: true, 
      mocked: true, 
      message: 'SMS logged to console. Provide Twilio credentials in .env to send real texts.' 
    });
  }

  try {
    const client = twilio(accountSid, authToken);
    const result = await client.messages.create({
      body: message,
      from: fromNumber,
      to: to
    });
    
    res.status(200).json({ success: true, mocked: false, messageId: result.sid });
  } catch (error: any) {
    console.error('Twilio SMS Error:', error);
    res.status(500).json({ message: 'Failed to send SMS', error: error.message });
  }
};
