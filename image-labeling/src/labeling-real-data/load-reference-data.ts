import { get, set } from "idb-keyval";

async function loadReferenceData(): Promise<FileSystemFileHandle[]> {
  const imageList = [];
  const persistedDirectoryHandle = await get<FileSystemDirectoryHandle>(
    "directoryHandle"
  );
  let directoryHandle = null;
  let status: PermissionState | null = null;
  if (persistedDirectoryHandle !== undefined) {
    status = await persistedDirectoryHandle.requestPermission({
      mode: "readwrite",
    });
  }
  if (status === "granted" && persistedDirectoryHandle !== undefined) {
    directoryHandle = persistedDirectoryHandle;
  } else {
    directoryHandle = await window.showDirectoryPicker();
  }
  for await (const entry of directoryHandle.values()) {
    console.log(entry.name);
    if (entry.name.includes(".jpg")) {
      imageList.push(entry as FileSystemFileHandle);
    }
  }
  console.log(`Found ${imageList.length} images`);
  set("directoryHandle", directoryHandle);
  return imageList;
}

export default loadReferenceData;
