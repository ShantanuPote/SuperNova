const ImageKit = require("imagekit");
const { v4: uuidv4 } = require("uuid");

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY || "test_public",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "test_private",
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || "",
});

async function uploadImage({ buffer, fileName, folder }) {
  if (!buffer || !fileName) {
    throw new Error("Missing required image data");
  }

  const res = await imagekit.upload({
    file: buffer,
    fileName:  uuidv4(),
    folder: folder || "Services",
  });

  return {
    url: res.url,
    thumbnail: res.thumbnailUrl || res.url,
    id: res.fileId,
  }
}

module.exports = {
  imagekit,
  uploadImage,
};
