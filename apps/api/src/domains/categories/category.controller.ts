import type { Request, Response } from 'express';
import { sendSuccess } from '../../common/http/api-response';
import { getCategoryTree } from './category.service';
import type { ListCategoriesQuery } from './category.types';

/** Tầng controller: đọc request đã được validate, gọi service, gói response. */
export async function listCategories(req: Request, res: Response): Promise<void> {
  const tree = await getCategoryTree(req.query as unknown as ListCategoriesQuery);
  sendSuccess(res, tree);
}
