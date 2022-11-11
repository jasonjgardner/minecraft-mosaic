/// <reference lib="dom" />
/// <reference lib="esnext" />
import { RGBA } from "../src/types.d.ts";
//import { rgbaMatch } from "../src/_utils.ts";

const ALLOWED_TYPES = ["image/jpeg", "image/gif", "image/png"];
const MAX_SIZE = 64;
const MAX_WIDTH = 512;

// function collectColors(ctx: CanvasRenderingContext2D, x: number, y: number) {
//   const colors: RGBA[] = [];

//   const imageData = ctx?.getImageData(0, 0, x, y);

//   const data = imageData ? imageData.data : null;
//   const len = Math.min(MAX_SIZE * MAX_SIZE * 4, data?.length || 0);

//   if (!data || !len) {
//     throw Error("Invalid image data");
//   }

//   for (let itr = 0; itr < len; itr += 4) {
//     const alpha = data[itr + 3] / 255;

//     if (alpha < 0.5) {
//       continue;
//     }

//     const rgba: RGBA = [data[itr], data[itr + 1], data[itr + 2], alpha];

//     colors.push(rgba);
//   }

//   return colors;
// }

function resizeImageInput(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  maxWidth: number,
) {
  const originalWidth = img.naturalWidth;
  const originalHeight = img.naturalHeight;

  const aspectRatio = originalWidth / originalHeight;

  let newWidth = Math.min(Math.max(1, Math.ceil(maxWidth)), originalWidth);
  let newHeight = newWidth / aspectRatio;

  // Don't enlarge some images
  if (newWidth > originalWidth && newWidth > maxWidth) {
    newWidth = originalWidth;
    newHeight = originalHeight;
  }

  canvas.width = newWidth;
  canvas.height = newHeight;

  const ctx = canvas.getContext("2d", {
    alpha: true,
  });

  ctx?.drawImage(img, 0, 0, newWidth, newHeight);

  // const colors = [];

  // if (ctx) {
  //   colors.push(...collectColors(ctx, newWidth, newHeight));
  // }

  // return colors;
}

function processImageInput(
  file: File,
): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const img = new Image();

      // @ts-ignore Source is read as data URL
      img.src = reader.result ?? "https://placekitten.com/64/64";

      img.onload = () => {
        res(img);
      };
    };

    reader.onerror = () => rej(new Error("Failed reading file"));
  });
}

globalThis.addEventListener("DOMContentLoaded", () => {
  const imageInput: HTMLInputElement = document.getElementById(
    "palette-source",
  ) as HTMLInputElement;

  const previewContainer: HTMLElement = document.getElementById(
    "preview-container",
  ) as HTMLElement;
  const previewCanvas = document.getElementById(
    "preview",
  ) as HTMLCanvasElement;
  const merPreviewCanvas = document.getElementById(
    "mer-preview",
  ) as HTMLCanvasElement;
  const normalPreviewCanvas = document.getElementById(
    "normal-preview",
  ) as HTMLCanvasElement;
  const form: HTMLFormElement = document.forms.namedItem(
    "config",
  ) as HTMLFormElement;
  const downloadLink = document.getElementById(
    "downloadLink",
  ) as HTMLAnchorElement;
  const generateBtn = document.getElementById("generate") as HTMLButtonElement;
  const imgValue: HTMLInputElement = document.getElementById(
    "img_value",
  ) as HTMLInputElement;
  const merValue: HTMLInputElement = document.getElementById(
    "mer_value",
  ) as HTMLInputElement;
  const normalValue: HTMLInputElement = document.getElementById(
    "normal_value",
  ) as HTMLInputElement;
  const sliceSizeSelect: HTMLSelectElement = document.getElementById(
    "slice-canvas-size",
  ) as HTMLSelectElement;

  downloadLink.hidden = true;

  function revokeDownload() {
    URL.revokeObjectURL(downloadLink.href);
    downloadLink.hidden = true;
    downloadLink.classList.remove("flex");
    downloadLink.classList.add("hidden");
  }

  async function onInput() {
    if (!imageInput || !imageInput.files?.length) {
      throw Error("Failed retrieving image preview");
    }

    revokeDownload();

    for (const k in previewContainer.children) {
      const child = previewContainer.children[k];

      if (
        child instanceof HTMLImageElement &&
        child.classList.contains("image-preview")
      ) {
        previewContainer.removeChild(child);
      }
    }

    const imageFiles = Array.from(imageInput.files);

    const merFile = imageFiles.find(({ name }) => name.endsWith("_mer.png"));
    const normalFile = imageFiles.find(({ name }) =>
      name.endsWith("_normal.png")
    );

    const outputSize = Math.min(
      MAX_WIDTH,
      Math.max(16, parseInt(sliceSizeSelect.value, 10)),
    );

    if (merFile) {
      const mer = await processImageInput(merFile);
      merPreviewCanvas.classList.remove("hidden");
      resizeImageInput(
        mer,
        merPreviewCanvas,
        outputSize,
      );
      merValue.value = merPreviewCanvas.toDataURL();
    }

    if (normalFile) {
      const normal = await processImageInput(normalFile);
      normalPreviewCanvas.classList.remove("hidden");
      resizeImageInput(
        normal,
        normalPreviewCanvas,
        outputSize,
      );
      normalValue.value = normalPreviewCanvas.toDataURL();
    }

    const imageFile = imageFiles.find(({ name }) =>
      name !== merFile?.name && name !== normalFile?.name &&
      (name.endsWith(".png") || name.endsWith(".gif"))
    );

    if (!imageFile) {
      throw Error("Failed retrieving image preview");
    }

    const img = await processImageInput(imageFile);

    if (imageFile?.name.endsWith(".gif")) {
      previewContainer.appendChild(img);
      previewCanvas.classList.add("hidden");
      imgValue.value = img.src;
      return;
    }

    previewCanvas.classList.remove("hidden");
    resizeImageInput(
      img,
      previewCanvas,
      outputSize,
    );
    imgValue.value = previewCanvas.toDataURL();
  }

  if (form && imageInput) {
    form.addEventListener(
      "submit",
      async function onSubmit(event: SubmitEvent) {
        event.preventDefault();

        generateBtn.disabled = true;

        const data = new FormData(form);

        data.set(
          "materials",
          [...form.materials.options].filter((o) => o.selected).map((
            { value },
          ) => value).join(","),
        );

        data.set("slice_count", form["slice-count"].value);
        data.set("slices", sliceSizeSelect.value);

        data.set("size", form.pack_size.value || 16);
        data.delete("pack_size");
        data.set("img_name", form.img_name.value || "input");

        data.set("img", form.img_value.value);

        data.delete("img_value");
        data.delete(imageInput.name);

        if (form.mer_value.value) {
          data.set("mer", form.mer_value.value);
          data.delete("mer_value");
        }

        if (form.normal_value.value) {
          data.set("normal", form.normal_value.value);
          data.delete("normal_value");
        }

        const ns = data.get("namespace") ?? form.namespace.value ?? "generated";

        try {
          const res = await fetch(form.action, {
            method: "post",
            body: data,
          });
          const blob = await res.blob();

          downloadLink.href = URL.createObjectURL(
            blob,
          );
          downloadLink.classList.add("flex");
          downloadLink.hidden = false;
          downloadLink.classList.remove("hidden");
          downloadLink.download = `${ns}.mcaddon`;
        } catch (err) {
          console.error(err);
        }

        generateBtn.disabled = false;
      },
    );
  }

  if (imageInput) {
    try {
      imageInput.addEventListener(
        "input",
        onInput,
      );
    } catch (err) {
      console.log(err);
    }
  }

  downloadLink.addEventListener("click", function initiateDownload() {
    setTimeout(() => revokeDownload(), 1000);
  });
});
