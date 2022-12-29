import { get } from "idb-keyval";
import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { IMAGE_ANNOTATOR_STORAGE } from "./image-annotator";

@customElement("image-explorer")
export class ImageExplorer extends LitElement {
  @property({ type: Array })
  imageList: FileSystemFileHandle[] = [];

  @state()
  activeImage: FileSystemFileHandle | null = null;

  @state()
  autoProceed = true;

  timeout: number | null = null;

  render() {
    return html`<div class="container">
        ${this.imageList.map(
          (image) =>
            html`<image-thumbnail
              @click="${() => {
                this._activateImage(image);
              }}"
              .image=${image}
            />`
        )}
      </div>
      <div>
        <button @click=${this._writeLabelingInfoToFileSystem}>
          save labeling information
        </button>
        <button
          @click=${() => {
            this.autoProceed = !this.autoProceed;
          }}
        >
          ${this.autoProceed ? "Disable auto proceed" : "Enable auto proceed"}
        </button>
      </div>
      ${this.activeImage !== null
        ? html`<image-annotator
            .image=${this.activeImage}
            @image-finished-annotating=${() => {
              this._enqueueImageCheck();
            }}
          />`
        : null}`;
  }

  _writeLabelingInfoToFileSystem = async () => {
    const labelingInfo = await get(IMAGE_ANNOTATOR_STORAGE);
    const fileHandle = await window.showSaveFilePicker({
      types: [
        {
          description: "JSON file",
          accept: { "application/json": [".json"] },
        },
      ],
    });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(labelingInfo, null, 2));
    await writable.close();
  };

  _enqueueImageCheck = () => {
    if (this.timeout !== null) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(async () => {
      const allEntries = await get(IMAGE_ANNOTATOR_STORAGE);
      const unconfiguredImage = this.imageList.find((image) => {
        return allEntries[image.name] === undefined;
      });

      if (unconfiguredImage !== undefined) {
        if (this.autoProceed) {
          this._activateImage(unconfiguredImage);
        }
        console.log("pending image", unconfiguredImage.name);
      }
    }, 300);
  };

  _activateImage(image: FileSystemFileHandle) {
    console.log("Activate image", image);
    this.activeImage = image;
  }

  static styles = css`
    .container {
      display: flex;
      overflow-x: scroll;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "image-explorer": ImageExplorer;
  }
}
