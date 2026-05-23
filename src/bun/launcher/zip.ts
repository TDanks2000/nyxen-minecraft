export type ZipEntry = {
  data: Buffer;
  name: string;
};

const inflateRawDeflate = (compressed: Buffer): Buffer => {
  const input = compressed as unknown as Uint8Array<ArrayBuffer>;

  return Buffer.from(Bun.inflateSync(input, { windowBits: -15 }));
};

const findEndOfCentralDirectory = (archive: Buffer): number => {
  const minimumOffset = Math.max(0, archive.length - 65_557);

  for (let offset = archive.length - 22; offset >= minimumOffset; offset -= 1) {
    if (archive.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("ZIP archive is invalid.");
};

const readEntryData = ({
  archive,
  compressedSize,
  compressionMethod,
  localHeaderOffset,
}: {
  archive: Buffer;
  compressedSize: number;
  compressionMethod: number;
  localHeaderOffset: number;
}): Buffer => {
  if (archive.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error("ZIP archive local header is invalid.");
  }

  const localFileNameLength = archive.readUInt16LE(localHeaderOffset + 26);
  const localExtraLength = archive.readUInt16LE(localHeaderOffset + 28);
  const dataStart =
    localHeaderOffset + 30 + localFileNameLength + localExtraLength;
  const compressedData = archive.subarray(
    dataStart,
    dataStart + compressedSize,
  );

  if (compressionMethod === 0) {
    return Buffer.from(compressedData);
  }

  if (compressionMethod === 8) {
    return inflateRawDeflate(Buffer.from(compressedData));
  }

  throw new Error(`Unsupported ZIP compression method ${compressionMethod}.`);
};

export const listZipEntries = (archiveData: Uint8Array): Array<ZipEntry> => {
  const archive = Buffer.from(archiveData);
  const endOffset = findEndOfCentralDirectory(archive);
  const totalEntries = archive.readUInt16LE(endOffset + 10);
  const centralDirectoryOffset = archive.readUInt32LE(endOffset + 16);
  const entries: Array<ZipEntry> = [];
  let offset = centralDirectoryOffset;

  for (let index = 0; index < totalEntries; index += 1) {
    if (archive.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("ZIP archive central directory is invalid.");
    }

    const compressionMethod = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const fileNameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeaderOffset = archive.readUInt32LE(offset + 42);
    const name = archive
      .subarray(offset + 46, offset + 46 + fileNameLength)
      .toString("utf8");

    if (!name.endsWith("/")) {
      entries.push({
        data: readEntryData({
          archive,
          compressedSize,
          compressionMethod,
          localHeaderOffset,
        }),
        name,
      });
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
};

export const readZipEntry = (
  archiveData: Uint8Array,
  entryName: string,
): Buffer | null =>
  listZipEntries(archiveData).find((entry) => entry.name === entryName)?.data ??
  null;

export const readZipJson = (
  archiveData: Uint8Array,
  entryName: string,
): unknown | null => {
  const entry = readZipEntry(archiveData, entryName);

  return entry ? JSON.parse(entry.toString("utf8")) : null;
};
