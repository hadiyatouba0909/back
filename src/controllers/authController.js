import User from '../models/User.js';
import Company from '../models/Company.js';
import _default from '../middleware/auth.js';
const { generateToken } = _default;

class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   */
  static async register(req, res, next) {
    try {
      const { firstName, lastName, email, phone, password, companyName, companyAddress } = req.body;
      
      // Validation des données utilisateur
      const validation = User.validate({ firstName, lastName, email, password });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }

      // Vérifier si l'email existe déjà
      const emailExists = await User.emailExists(email);
      if (emailExists) {
        return res.status(409).json({ error: 'Email already registered' });
      }

      let companyId = null;
      
      // Créer une entreprise si fournie
      if (companyName) {
        const companyValidation = Company.validate({ name: companyName });
        if (!companyValidation.isValid) {
          return res.status(400).json({ 
            error: 'Données d\'entreprise invalides', 
            details: companyValidation.errors 
          });
        }
        
        const company = await Company.create({
          name: companyName,
          address: companyAddress
        });
        companyId = company.id;
      }

      // Créer l'utilisateur
      const user = await User.create({
        firstName,
        lastName,
        email,
        phone,
        password,
        companyId
      });

      const token = generateToken({ id: user.id, email: user.email });

      res.status(201).json({
        token,
        user
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ error: 'email and password are required' });
      }

      // Trouver l'utilisateur par email
      const user = await User.findByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Vérifier le mot de passe
      const isValidPassword = await User.verifyPassword(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      const token = generateToken({ id: user.id, email: user.email });
      
      res.json({
        token,
        user: {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          email: user.email,
          phone: user.phone,
          companyId: user.company_id
        }
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer les informations de l'utilisateur connecté
   */
  static async getMe(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer le profil utilisateur
   */
  static async getProfile(req, res, next) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mettre à jour le profil utilisateur
   */
  static async updateProfile(req, res, next) {
    try {
      const userId = req.user.id;
      const { firstName, lastName, email, phone } = req.body;
      
      // Validation des données
      const validation = User.validate({ firstName, lastName, email }, true);
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }
      
      // Vérifier si l'email n'est pas déjà utilisé par un autre utilisateur
      const emailExists = await User.emailExists(email, userId);
      if (emailExists) {
        return res.status(409).json({ error: 'Email already used by another user' });
      }
      
      const updatedUser = await User.updateProfile(userId, {
        firstName,
        lastName,
        email,
        phone
      });
      
      res.json({
        message: 'Profile updated successfully',
        user: updatedUser
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Changer le mot de passe
   */
  static async changePassword(req, res, next) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;
      
      // Validation des données
      const validation = User.validatePasswordChange({ currentPassword, newPassword });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }
      
      // Récupérer le mot de passe actuel
      const currentPasswordHash = await User.getPasswordHash(userId);
      if (!currentPasswordHash) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Vérifier le mot de passe actuel
      const isValidPassword = await User.verifyPassword(currentPassword, currentPasswordHash);
      if (!isValidPassword) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Mettre à jour le mot de passe
      const updated = await User.updatePassword(userId, newPassword);
      if (!updated) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
      
      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export default AuthController;

