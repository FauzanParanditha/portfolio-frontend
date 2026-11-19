"use client";

import { Component, type ReactNode } from "react";

/** Menangkap kegagalan scene (mis. konteks WebGL ditolak) → tampilan cadangan. */
export class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("[scene] scene 3D gagal dimuat:", error);
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
