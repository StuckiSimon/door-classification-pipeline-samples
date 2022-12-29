import { LitElement, css, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("image-thumbnail")
export class ImageThumbnail extends LitElement {
  @property({ type: FileSystemFileHandle })
  image: FileSystemFileHandle = {} as FileSystemFileHandle;

  @state()
  imageSrc: string | null = null;

  render() {
    if (!this.imageSrc) {
      return null;
    }
    return html`<img class="image" src=${this.imageSrc} />`;
  }

  connectedCallback() {
    super.connectedCallback();
    this._loadImageThumbnail();
  }

  async _loadImageThumbnail() {
    const imageFile = await this.image.getFile();
    const imageStream = imageFile.stream();

    let reader = imageStream.getReader();
    const updatedStream = new ReadableStream({
      start(controller) {
        return pump();
        function pump() {
          return reader.read().then(({ done, value }) => {
            // When no more data needs to be consumed, close the stream
            if (done) {
              controller.close();
              return;
            }
            // Enqueue the next data chunk into our target stream
            controller.enqueue(value);
            return pump();
          });
        }
      },
    });
    const newRes = new Response(updatedStream);
    const blobData = await newRes.blob();
    const imageAsUrl = URL.createObjectURL(blobData);

    this.imageSrc = imageAsUrl;
  }

  static styles = css`
    .image {
      width: 200px;
      height: 400px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "image-thumbnail": ImageThumbnail;
  }
}
