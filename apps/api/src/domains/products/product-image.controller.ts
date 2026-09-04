import type { Request, Response } from 'express';
import { sendNoContent, sendSuccess } from '../../common/http/api-response';
import * as service from './product-image.service';

export async function list(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  sendSuccess(res, await service.listImages(id));
}

export async function upload(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const body = req.body as { alt?: string; isPrimary?: boolean };
  sendSuccess(res, await service.addImage(id, req.file, body), 201);
}

export async function replace(req: Request, res: Response): Promise<void> {
  const { id, imageId } = req.params as { id: string; imageId: string };
  const body = req.body as { alt?: string };
  sendSuccess(res, await service.replaceImage(id, imageId, req.file, body));
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id, imageId } = req.params as { id: string; imageId: string };
  const body = req.body as { alt?: string | null; isPrimary?: boolean };
  sendSuccess(res, await service.updateImage(id, imageId, body));
}

export async function reorder(req: Request, res: Response): Promise<void> {
  const { id } = req.params as { id: string };
  const { order } = req.body as { order: string[] };
  sendSuccess(res, await service.reorderImages(id, order));
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id, imageId } = req.params as { id: string; imageId: string };
  await service.removeImage(id, imageId);
  sendNoContent(res);
}
