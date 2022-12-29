import { get, set } from "idb-keyval";
import { LitElement, css, html, PropertyValueMap } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";

// usually right mouse button
const SECONDARY_MOUSE_BUTTON = 2;

export const IMAGE_ANNOTATOR_STORAGE = "image-annotations";

const CANVAS_WIDTH = 500;
const CANVAS_HEIGHT = 1000;

@customElement("image-annotator")
export class ImageAnnotator extends LitElement {
  @property({ type: FileSystemFileHandle })
  image: FileSystemFileHandle = {} as FileSystemFileHandle;

  @query("canvas")
  canvasElement: HTMLCanvasElement;

  @state()
  renderedImage: HTMLImageElement | null = null;

  @state()
  points: { x: number; y: number }[] = [];

  @state()
  openingDirection: "left" | "right" | null = null;

  render() {
    return html`<canvas
        @pointerdown=${this._canvasClick}
        class="canvas"
      ></canvas>
      ${this.image?.name} ${this.openingDirection}
      <button
        @click=${() => {
          this.openingDirection = "left";
        }}
      >
        Left
      </button>
      <button
        @click=${() => {
          this.openingDirection = "right";
        }}
      >
        Right
      </button>`;
  }

  firstUpdated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.firstUpdated(_changedProperties);

    const canvasObserver = new ResizeObserver((entries) => {
      // ignore entries as we only have one canvas
      this._adjustCanvasToDisplaySize(this.canvasElement);
    });

    canvasObserver.observe(this.canvasElement);
    this._adjustCanvasToDisplaySize(this.canvasElement);
  }

  updated(
    _changedProperties: PropertyValueMap<any> | Map<PropertyKey, unknown>
  ): void {
    super.updated(_changedProperties);

    if (_changedProperties.has("image")) {
      this.renderedImage = null;
      this._loadImage();
      this.points = [];
      this.openingDirection = null;
    }

    if (_changedProperties.has("renderedImage")) {
      this._drawImage();
    }

    if (_changedProperties.has("points")) {
      this._drawImage();
      const ctx = this.canvasElement.getContext("2d")!;
      this.points.forEach(({ x, y }) => {
        ctx.beginPath();
        ctx.fillStyle = "red";
        ctx.arc(x, y, 5, 0, 2 * Math.PI);
        ctx.fill();
      });
    }

    if (
      _changedProperties.has("openingDirection") ||
      _changedProperties.has("points")
    ) {
      if (this.renderedImage !== null) {
        if (this.openingDirection !== null && this.points.length === 4) {
          this._persistDataInStorage();
        }
      }
    }

    if (
      _changedProperties.has("image") ||
      _changedProperties.has("renderedImage")
    ) {
      this._attemptStorageReappliance();
    }
  }

  async _attemptStorageReappliance() {
    const data = (await get(IMAGE_ANNOTATOR_STORAGE)) || {};
    const imageData = data[this.image.name];
    if (imageData) {
      // todo: convert from ndc to canvas coordinates
      const { renderedWidth, renderedHeight } =
        this._getCanvasContextConstraints(
          this.canvasElement,
          this.renderedImage!
        );
      const normalizedPointsCanvasCoordinateSystem = imageData.points.map(
        ({ x, y }) => ({
          x: x,
          y: 1 - y,
        })
      );
      const pointsInScreenSpace = normalizedPointsCanvasCoordinateSystem.map(
        ({ x, y }) => {
          const xOnPicture = x * renderedWidth;
          const xOffset = (this.canvasElement.width - renderedWidth) / 2;
          const xOnCanvas = xOnPicture + xOffset;

          const yOnPicture = y * renderedHeight;
          const yOffset = (this.canvasElement.height - renderedHeight) / 2;
          const yOnCanvas = yOnPicture + yOffset;
          return {
            x: xOnCanvas,
            y: yOnCanvas,
          };
        }
      );
      this.points = [...pointsInScreenSpace];
      this.openingDirection = imageData.openingDirection;
    }
  }

  async _persistDataInStorage() {
    const data = (await get(IMAGE_ANNOTATOR_STORAGE)) || {};

    if (!this.renderedImage) {
      return;
    }
    const { renderedWidth, renderedHeight } = this._getCanvasContextConstraints(
      this.canvasElement,
      this.renderedImage
    );

    const xOffset = (this.canvasElement.width - renderedWidth) / 2;
    const yOffset = (this.canvasElement.height - renderedHeight) / 2;

    const normalizedPointsCanvasCoordinateSystem = this.points.map(
      ({ x, y }) => {
        const xOnPicture = x - xOffset;
        const normalizedX = (1 / renderedWidth) * xOnPicture;

        const yOnPicture = y - yOffset;
        const normalizedY = (1 / renderedHeight) * yOnPicture;
        return {
          x: normalizedX,
          y: normalizedY,
        };
      }
    );
    const normalizedPointsDefaultCoordinateSystem =
      normalizedPointsCanvasCoordinateSystem.map(({ x, y }) => ({
        x: x,
        y: 1 - y,
      }));

    data[this.image.name] = {
      points: normalizedPointsDefaultCoordinateSystem,
      openingDirection: this.openingDirection,
    };
    set(IMAGE_ANNOTATOR_STORAGE, data);

    const event = new CustomEvent("image-finished-annotating");
    this.dispatchEvent(event);
  }

  _getCanvasContextConstraints(
    canvas: HTMLCanvasElement,
    renderedImage: HTMLImageElement
  ) {
    const ratioX = canvas.width / (renderedImage.naturalWidth * 1.2);
    const ratioY = canvas.height / (renderedImage.naturalHeight * 1.2);
    const ratio = Math.min(ratioX, ratioY);

    const renderedWidth = renderedImage.naturalWidth * ratio;
    const renderedHeight = renderedImage.naturalHeight * ratio;

    return {
      renderedWidth,
      renderedHeight,
    };
  }

  _drawImage() {
    const image = this.renderedImage;
    if (image !== null) {
      const ctx = this.canvasElement.getContext("2d")!;
      ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);

      const { renderedWidth, renderedHeight } =
        this._getCanvasContextConstraints(this.canvasElement, image);

      ctx.drawImage(
        image,
        this.canvasElement.width / 2 - renderedWidth / 2,
        this.canvasElement.height / 2 - renderedHeight / 2,
        renderedWidth,
        renderedHeight
      );
    }
  }

  _canvasClick = (event: PointerEvent) => {
    if (event.button === SECONDARY_MOUSE_BUTTON) {
      this.points = [];
    } else {
      const pos = { x: event.offsetX, y: event.offsetY };
      if (this.points.length > 3) {
        const distances = this.points.map(({ x, y }) => {
          return Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        });
        const minDistance = Math.min(...distances);
        const minDistanceIndex = distances.indexOf(minDistance);
        this.points = [
          ...this.points.filter((_, index) => index !== minDistanceIndex),
          pos,
        ];
      } else {
        this.points = [...this.points, pos];
      }
    }
  };

  connectedCallback() {
    super.connectedCallback();
  }

  _adjustCanvasToDisplaySize(canvas: HTMLCanvasElement) {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
  }

  async _loadImage() {
    // todo: make reusable
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

    const image = document.createElement("img");

    image.onload = () => {
      this.renderedImage = image;
    };
    image.src = imageAsUrl;
  }

  static styles = css`
    .canvas {
      width: ${CANVAS_WIDTH}px;
      height: ${CANVAS_HEIGHT}px;
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "image-annotator": ImageAnnotator;
  }
}
