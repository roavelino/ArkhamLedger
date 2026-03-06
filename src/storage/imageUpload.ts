export async function uploadImage(file) {
  return {
    name: file.name,
    size: file.size
  };
}
