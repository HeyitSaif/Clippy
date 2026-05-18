import { useEffect, useState } from "react";
import {
  formatAcceleratorDisplay,
  isMacPlatform,
  pasteSlotDisplay,
} from "@shared/hotkey";

export function usePlatform() {
  const [platform, setPlatform] = useState<NodeJS.Platform>("darwin");

  useEffect(() => {
    void window.clippy.getPlatform().then(setPlatform);
  }, []);

  return {
    platform,
    isMac: isMacPlatform(platform),
    pasteSlotLabel: pasteSlotDisplay(platform),
    formatShortcut: (accel: string) => formatAcceleratorDisplay(accel, platform),
  };
}
