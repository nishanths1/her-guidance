import { Request, Response } from 'express';
import Alert from '../models/Alert';
import { AuthRequest } from '../middleware/authMiddleware';

export const createAlert = async (req: AuthRequest, res: Response) => {
  const { location, audioUrl, photoUrl } = req.body;

  // Basic Threat calculation based on time of day (Mock AI)
  const hour = new Date().getHours();
  let threatLevel = 'moderate';
  if (hour < 6 || hour > 20) threatLevel = 'critical';

  try {
    const alert = await Alert.create({
      user: req.user._id,
      location,
      threatLevel,
      audioUrls: audioUrl ? [audioUrl] : [],
      photoUrls: photoUrl ? [photoUrl] : [],
    });

    res.status(201).json(alert);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAlert = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { location, audioUrl, photoUrl, videoUrl } = req.body;

  try {
    const alert = await Alert.findById(id);

    if (alert) {
      if (location) alert.location = location;
      if (audioUrl) alert.audioUrls?.push(audioUrl);
      if (photoUrl) alert.photoUrls?.push(photoUrl);
      if (videoUrl) alert.videoUrls?.push(videoUrl);

      // Simple AI Threat Calculation update
      if (audioUrl || videoUrl) {
        alert.threatLevel = 'critical'; // Escalate if media is being streamed
      }

      const updatedAlert = await alert.save();
      res.json(updatedAlert);
    } else {
      res.status(404).json({ message: 'Alert not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAlerts = async (req: Request, res: Response) => {
  try {
    const alerts = await Alert.find().populate('user', 'name phone email').sort({ createdAt: -1 });
    res.json(alerts);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const resolveAlert = async (req: AuthRequest, res: Response) => {
  try {
    const alert = await Alert.findById(req.params.id);

    if (alert) {
      alert.status = 'resolved';
      alert.resolvedBy = req.user._id;
      const updatedAlert = await alert.save();
      res.json(updatedAlert);
    } else {
      res.status(404).json({ message: 'Alert not found' });
    }
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};
