import Company from '../models/Company.js';

class CompanyController {
  /**
   * Récupérer les informations de l'entreprise de l'utilisateur connecté
   */
  static async getAll(req, res, next) {
    try {
      const companies = await Company.findByUserId(req.user.id);
      res.json(companies);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Récupérer une entreprise spécifique
   */
  static async getById(req, res, next) {
    try {
      const companyId = req.params.id;
      const userId = req.user.id;
      
      // Vérifier que l'utilisateur appartient à cette entreprise
      const userBelongs = await Company.userBelongsToCompany(userId, companyId);
      if (!userBelongs) {
        return res.status(403).json({ error: 'Access denied to this company' });
      }
      
      const company = await Company.findById(companyId);
      if (!company) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json(company);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Créer une nouvelle entreprise
   */
  static async create(req, res, next) {
    try {
      const userId = req.user.id;
      const { name, address, email, phone } = req.body;
      
      // Validation des données
      const validation = Company.validate({ name });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }
      
      // Vérifier que l'utilisateur n'a pas déjà une entreprise
      const existingCompanyId = await Company.getCompanyIdByUserId(userId);
      if (existingCompanyId) {
        return res.status(400).json({ error: 'User already has a company' });
      }
      
      // Créer la nouvelle entreprise
      const company = await Company.create({ name, address, email, phone });
      
      // Associer l'utilisateur à cette entreprise
      await Company.associateUser(userId, company.id);
      
      res.status(201).json({
        message: 'Company created successfully',
        company
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Mettre à jour les informations de l'entreprise
   */
  static async update(req, res, next) {
    try {
      const companyId = req.params.id;
      const userId = req.user.id;
      const { name, address, email, phone } = req.body;
      
      // Validation des données
      const validation = Company.validate({ name });
      if (!validation.isValid) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: validation.errors 
        });
      }
      
      // Vérifier que l'utilisateur appartient à cette entreprise
      const userBelongs = await Company.userBelongsToCompany(userId, companyId);
      if (!userBelongs) {
        return res.status(403).json({ error: 'Access denied to this company' });
      }
      
      const updated = await Company.update(companyId, { name, address, email, phone });
      if (!updated) {
        return res.status(404).json({ error: 'Company not found' });
      }
      
      res.json({ message: 'Company updated successfully' });
    } catch (err) {
      next(err);
    }
  }
}

export default CompanyController;

