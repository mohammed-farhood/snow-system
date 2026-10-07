import { Request, Response, NextFunction } from "express";
import * as fs from "fs";
import * as path from "path";

const SETTINGS_PATH = path.join(__dirname, "../../data/settings.json");

interface AppSettings {
  snowBlockPrice: number;
  snowCrushedPrice: number;
}

const DEFAULTS: AppSettings = {
  snowBlockPrice: 2500,
  snowCrushedPrice: 1500,
};

export function readSettings(): AppSettings {
  try {
    const raw = fs.readFileSync(SETTINGS_PATH, "utf-8");
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULTS };
  }
}

function saveSettings(settings: AppSettings): void {
  const dir = path.dirname(SETTINGS_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2));
}

export const getSettings = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    res.json({ success: true, data: readSettings() });
  } catch (error) {
    next(error);
  }
};

export const updateSettings = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const current = readSettings();
    const { snowBlockPrice, snowCrushedPrice } = req.body as Partial<AppSettings>;
    const updated: AppSettings = {
      snowBlockPrice: snowBlockPrice !== undefined ? Number(snowBlockPrice) : current.snowBlockPrice,
      snowCrushedPrice: snowCrushedPrice !== undefined ? Number(snowCrushedPrice) : current.snowCrushedPrice,
    };
    saveSettings(updated);
    res.json({ success: true, data: updated });
  } catch (error) {
    next(error);
  }
};
