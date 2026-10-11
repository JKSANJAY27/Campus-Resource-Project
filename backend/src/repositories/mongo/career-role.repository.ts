import { BaseMongoRepository } from './base.repository.js';
import { CareerRoleModel, ICareerRole } from '../../models/mongo/index.js';
import { CURATED_CAREER_ROLES } from '../../constants/career-roles.data.js';

export class CareerRoleRepository extends BaseMongoRepository<ICareerRole> {
  constructor() {
    super(CareerRoleModel, 'roleId');
  }

  public async findByRoleId(roleId: string): Promise<ICareerRole | null> {
    return this.model.findOne({ roleId }).exec();
  }

  public async findBySlug(slug: string): Promise<ICareerRole | null> {
    return this.model.findOne({ slug }).exec();
  }

  public async findByCategory(category: string): Promise<ICareerRole[]> {
    return this.model.find({ category }).sort({ title: 1 }).exec();
  }

  public async ensureCuratedRolesSeeded(): Promise<number> {
    const count = await this.model.countDocuments();
    if (count >= CURATED_CAREER_ROLES.length) {
      return count;
    }

    let inserted = 0;
    for (const roleData of CURATED_CAREER_ROLES) {
      const existing = await this.model.findOne({ roleId: roleData.roleId });
      if (!existing) {
        await this.model.create(roleData);
        inserted++;
      }
    }
    return (await this.model.countDocuments()) || inserted;
  }
}

export const careerRoleRepository = new CareerRoleRepository();
