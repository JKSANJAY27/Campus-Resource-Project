import { Model, Document, FilterQuery } from 'mongoose';
import { QueryOptions, PaginatedResult } from '../../types/query.js';

export class BaseMongoRepository<T extends Document> {
  protected model: Model<T>;
  protected idFieldName: string;

  constructor(model: Model<T>, idFieldName: string = '_id') {
    this.model = model;
    this.idFieldName = idFieldName;
  }

  public async create(data: Partial<T>): Promise<T> {
    return this.model.create(data);
  }

  public async findById(id: string): Promise<T | null> {
    const query: any = {};
    query[this.idFieldName] = id;
    return this.model.findOne(query).exec();
  }

  public async findAll(options: QueryOptions = {}, searchFields: string[] = []): Promise<PaginatedResult<T>> {
    const page = Math.max(1, options.page || 1);
    const limit = Math.max(1, Math.min(100, options.limit || 20));
    const skip = (page - 1) * limit;

    const query: FilterQuery<T> = { ...(options.filter || {}) } as FilterQuery<T>;

    // Full-text or regex search across designated fields
    if (options.search && options.search.trim()) {
      const searchTerm = options.search.trim();
      if (searchFields.length > 0) {
        query.$or = searchFields.map((field) => ({
          [field]: { $regex: searchTerm, $options: 'i' },
        })) as any;
      } else {
        query.$text = { $search: searchTerm };
      }
    }

    // Sorting
    const sort: Record<string, 1 | -1> = {};
    if (options.sortBy) {
      sort[options.sortBy] = options.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort.createdAt = -1;
    }

    const [data, total] = await Promise.all([
      this.model.find(query).sort(sort).skip(skip).limit(limit).exec(),
      this.model.countDocuments(query).exec(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    };
  }

  public async update(id: string, data: Partial<T>): Promise<T | null> {
    const query: any = {};
    query[this.idFieldName] = id;
    return this.model.findOneAndUpdate(query, data, { new: true, runValidators: true }).exec();
  }

  public async delete(id: string): Promise<boolean> {
    const query: any = {};
    query[this.idFieldName] = id;
    const res = await this.model.deleteOne(query).exec();
    return res.deletedCount > 0;
  }

  public async count(filter: FilterQuery<T> = {}): Promise<number> {
    return this.model.countDocuments(filter).exec();
  }
}
