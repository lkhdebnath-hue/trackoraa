import { Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User';
import { AuditLog } from '../models/AuditLog';
import { IRequestWithUser } from '../middleware/auth';

const JWT_SECRET = process.env.JWT_SECRET || 'trackora_jwt_secret_key_change_in_production_12345';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'trackora_jwt_refresh_secret_key_change_in_production_54321';

const signTokens = (userId: string) => {
  const accessToken = jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: '1h' });
  const refreshToken = jwt.sign({ id: userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  return { accessToken, refreshToken };
};

export class AuthController {
  // Username & Password Login
  public static async login(req: IRequestWithUser, res: Response) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required.' });
      }

      const user = await User.findOne({ username });
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Your account has been suspended.' });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid username or password.' });
      }

      const { accessToken, refreshToken } = signTokens(user._id.toString());

      // Save FCM Token if passed
      if (req.body.fcmToken && !user.fcmTokens.includes(req.body.fcmToken)) {
        user.fcmTokens.push(req.body.fcmToken);
        await user.save();
      }

      // Audit Log
      await AuditLog.create({
        actorId: user._id,
        action: 'USER_LOGIN',
        details: `User ${user.username} logged in successfully.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          username: user.username,
          role: user.role,
          department: user.department,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      console.error('Login error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error during login.'  });
    }
  }

  // Refresh Token
  public static async refresh(req: IRequestWithUser, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required.' });
      }

      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET);
      } catch (err) {
        return res.status(401).json({ message: 'Invalid or expired refresh token.' });
      }

      const user = await User.findById(decoded.id);
      if (!user || user.status === 'suspended') {
        return res.status(401).json({ message: 'User not authorized.' });
      }

      const tokens = signTokens(user._id.toString());
      return res.status(200).json(tokens);
    } catch (error: any) {
      console.error('Refresh token error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error during refresh.'  });
    }
  }

  // Register Biometric Public Key
  public static async registerBiometric(req: IRequestWithUser, res: Response) {
    try {
      const { publicKey } = req.body;
      const user = req.user;

      if (!user) {
        return res.status(401).json({ message: 'Unauthenticated.' });
      }

      if (!publicKey) {
        return res.status(400).json({ message: 'Public key is required.' });
      }

      user.biometricPublicKey = publicKey;
      await user.save();

      // Audit Log
      await AuditLog.create({
        actorId: user._id,
        action: 'BIOMETRIC_REGISTER',
        details: `User ${user.username} registered biometrics.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({ message: 'Biometrics registered successfully.' });
    } catch (error: any) {
      console.error('Register biometrics error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error.'  });
    }
  }

  // Biometric Login
  public static async loginBiometric(req: IRequestWithUser, res: Response) {
    try {
      const { username, signature, challenge } = req.body;

      if (!username || !signature || !challenge) {
        return res.status(400).json({ message: 'Username, signature, and challenge are required.' });
      }

      const user = await User.findOne({ username });
      if (!user || !user.biometricPublicKey) {
        return res.status(401).json({ message: 'Biometric authentication not set up for this user.' });
      }

      if (user.status === 'suspended') {
        return res.status(403).json({ message: 'Account is suspended.' });
      }

      // Verify the signature with the user's public key
      const verifier = crypto.createVerify('SHA256');
      verifier.update(challenge);
      const isVerified = verifier.verify(user.biometricPublicKey, signature, 'hex');

      if (!isVerified) {
        return res.status(401).json({ message: 'Biometric signature verification failed.' });
      }

      const { accessToken, refreshToken } = signTokens(user._id.toString());

      // Audit Log
      await AuditLog.create({
        actorId: user._id,
        action: 'USER_LOGIN_BIOMETRIC',
        details: `User ${user.username} logged in via biometrics.`,
        ipAddress: req.ip || '127.0.0.1',
      });

      return res.status(200).json({
        accessToken,
        refreshToken,
        user: {
          id: user._id,
          employeeId: user.employeeId,
          username: user.username,
          role: user.role,
          department: user.department,
          permissions: user.permissions,
        },
      });
    } catch (error: any) {
      console.error('Biometric login error:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: Object.values(error.errors).map((e: any) => e.message).join(', ') });
      }
      return res.status(500).json({ message: 'Internal server error during biometric login.'  });
    }
  }
}
export default AuthController;
