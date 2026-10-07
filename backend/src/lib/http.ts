import { Request, Response, NextFunction, RequestHandler } from "express";

export class HttpError extends Error {
  constructor(public statusCode: number, message: string) {
    super(message);
  }
}

/** Wraps an async route so thrown errors reach the error handler, and sends `{ success, data }`. */
export const h =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res)
      .then((data) => {
        if (!res.headersSent) res.json({ success: true, data });
      })
      .catch(next);
  };

export const idParam = (req: Request): number => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, "رقم غير صالح");
  return id;
};
