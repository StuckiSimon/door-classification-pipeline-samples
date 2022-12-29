import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import loadReferenceData from "./load-reference-data";
import "./image-explorer";
import "./image-thumbnail";
import "./image-annotator";
type AppState = "idle" | "loading" | "loaded";

@customElement("labeling-real-data")
export class LabelingRealData extends LitElement {
  @state()
  state: AppState = "idle";

  @state()
  imageList: FileSystemFileHandle[] = [];

  render() {
    switch (this.state) {
      case "idle":
        return html`<p class="global-message">
          Click to start labeling process
        </p>`;
      case "loading":
        return html`<p class="global-message">Loading...</p>`;
      case "loaded":
        return html`<image-explorer .imageList=${this.imageList} />`;
    }
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener("click", this._handleStateChange, { once: true });
  }

  disconnectedCallback() {
    window.removeEventListener("click", this._handleStateChange);
    super.disconnectedCallback();
  }

  _handleStateChange = () => {
    this.state = "loading";
    (async () => {
      this.imageList = await loadReferenceData();
      this.state = "loaded";
    })();
  };

  static styles = css`
    .global-message {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 24px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "labeling-real-data": LabelingRealData;
  }
}
