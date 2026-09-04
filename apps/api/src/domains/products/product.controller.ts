import type { Request, Response } from 'express';
import { sendPaginated, sendSuccess } from '../../common/http/api-response';
import * as productService from './product.service';
import type { ListProductsQuery } from './product.types';

export async function list(req: Request, res: Response): Promise<void> {
  const { items, meta } = await productService.listProducts(
    req.query as unknown as ListProductsQuery,
  );
  sendPaginated(res, items, meta);
}

export async function detail(req: Request, res: Response): Promise<void> {
  const { slug } = req.params as { slug: string };
  sendSuccess(res, await productService.getProductBySlug(slug));
}

export async function brands(_req: Request, res: Response): Promise<void> {
  sendSuccess(res, await productService.listBrands());
}
