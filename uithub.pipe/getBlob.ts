/**
 * TODO: This is quite slow now for large zips when the file is far away.
 *
 * It can be useful if the raw context url is NOT on github and also not available ANYWHERE though.
 */
export const getBlobFromZip = async (
  owner: string,
  repo: string,
  branch: string,
  path: string,
) => {
  const url = `https://pipe.uithub.com/${owner}/${repo}/blob/${branch}/${path}?isFirstHitOnly=true`;
  const headers = undefined;
  const fileResponse = await fetch(url, { headers });

  const formData = await fileResponse.formData();

  const blob = formData.get("/" + path);

  if (blob instanceof File) {
    const contentType = blob.type;
    console.log("File type:", contentType);
    console.log("File size:", blob.size);

    const content = await blob.arrayBuffer();
    console.log("ArrayBuffer size:", content.byteLength);

    // Create response with appropriate content type and content
    return new Response(content, {
      headers: {
        "Content-Type": contentType || "application/octet-stream",
        "Content-Length": content.byteLength.toString(),
      },
    });
  } else {
    // Handle the case where blob is not a File
    return new Response(`File at path "${path}" not found`, {
      status: 404,
    });
  }
};
