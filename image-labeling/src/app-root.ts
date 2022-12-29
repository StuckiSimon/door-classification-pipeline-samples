import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import "./labeling-real-data/labeling-real-data";

import "./index.css";

type AppState = "init" | "real-labeling";

@customElement("app-root")
export class AppRoot extends LitElement {
  @state()
  state: AppState = "init";

  render() {
    switch (this.state) {
      case "init":
        return html`<div class="wrapper">
          <button
            class="global-message"
            @click=${() => {
              this.state = "real-labeling";
            }}
          >
            Real Data Labeling
          </button>
        </div>`;
      case "real-labeling":
        return html`<labeling-real-data></labeling-real-data>`;
    }
  }

  static styles = css`
    .wrapper {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
    }
    button {
      border: 1px solid black;
      background: transparent;
      border-radius: 4px;
      padding: 8px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "app-root": AppRoot;
  }
}
