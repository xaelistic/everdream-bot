// IPFS upload utility — Pinata
// Uploads images and JSON metadata to IPFS via Pinata API

const PINATA_API = "https://api.pinata.cloud";

async function pinFileToIPFS(filePath, fileName, pinataJWT) {
  const fs = await import("fs");
  const FormData = (await import("formdata-node")).default;
  const { fileFromPath } = await import("formdata-node/file-from-path");

  const formData = new FormData();
  const file = await fileFromPath(filePath, fileName);
  formData.append("file", file);
  formData.append("pinataMetadata", JSON.stringify({ name: fileName }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch(`${PINATA_API}/pinning/pinFileToIPFS`, {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJWT}` },
    body: formData,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata file upload failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

async function pinJSONToIPFS(json, name, pinataJWT) {
  const res = await fetch(`${PINATA_API}/pinning/pinJSONToIPFS`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pinataJWT}`,
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Pinata JSON upload failed: ${res.status} ${err}`);
  }

  const data = await res.json();
  return data.IpfsHash;
}

// Upload a dream image + metadata, return the metadata URI
export async function uploadDreamToIPFS(imagePath, metadata, pinataJWT) {
  // 1. Upload image
  const imageHash = await pinFileToIPFS(imagePath, metadata.name + ".png", pinataJWT);
  const imageURI = `ipfs://${imageHash}`;

  // 2. Build OpenSea-compatible metadata
  const nftMetadata = {
    name: metadata.name,
    description: metadata.description || "",
    image: imageURI,
    external_url: metadata.externalUrl || "https://everdream.app",
    attributes: [
      { trait_type: "Category", value: metadata.category || "dream" },
      { trait_type: "Emotion", value: metadata.emotion || "neutral" },
      { trait_type: "Themes", value: (metadata.themes || []).join(", ") },
      { trait_type: "Created", value: Math.floor(Date.now() / 1000), display_type: "date" },
      ...(metadata.remixOf ? [{ trait_type: "Type", value: "Remix" }] : [{ trait_type: "Type", value: "Original" }]),
    ],
  };

  // 3. Upload metadata JSON
  const metadataHash = await pinJSONToIPFS(nftMetadata, metadata.name + ".json", pinataJWT);
  return {
    metadataURI: `ipfs://${metadataHash}`,
    imageURI,
    metadata: nftMetadata,
  };
}

// Upload metadata only (no image) — for text-only dreams
export async function uploadMetadataToIPFS(metadata, pinataJWT) {
  const nftMetadata = {
    name: metadata.name,
    description: metadata.description || "",
    image: metadata.image || "",
    external_url: metadata.externalUrl || "https://everdream.app",
    attributes: [
      { trait_type: "Category", value: metadata.category || "dream" },
      { trait_type: "Emotion", value: metadata.emotion || "neutral" },
      { trait_type: "Themes", value: (metadata.themes || []).join(", ") },
      { trait_type: "Created", value: Math.floor(Date.now() / 1000), display_type: "date" },
    ],
  };

  const metadataHash = await pinJSONToIPFS(nftMetadata, metadata.name + ".json", pinataJWT);
  return {
    metadataURI: `ipfs://${metadataHash}`,
    metadata: nftMetadata,
  };
}

export { pinFileToIPFS, pinJSONToIPFS };
