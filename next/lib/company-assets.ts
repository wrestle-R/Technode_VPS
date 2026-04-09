import { access, mkdir, readFile, rename, writeFile } from "node:fs/promises"
import { existsSync } from "node:fs"
import path from "node:path"

const ALLOWED_IMAGE_TYPES = new Map([
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
  ["image/svg+xml", ".svg"],
  ["image/x-icon", ".ico"],
  ["image/vnd.microsoft.icon", ".ico"],
])

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024

function getRepoRoot() {
  const cwd = process.cwd()
  const uploadsInCwd = path.join(cwd, "uploads")

  if (existsSync(uploadsInCwd)) {
    return cwd
  }

  return path.resolve(cwd, "..")
}

export function getUploadsRoot() {
  return path.join(getRepoRoot(), "uploads")
}

export function getCompanyAssetUrl(relativePath: string) {
  return `/uploads/${relativePath.replace(/^\/+/, "")}`
}

export function getCompanyAssetRelativePath(slug: string, filename: string) {
  return path.posix.join("companies", slug, filename)
}

export function getCompanyAssetFilename(
  kind: "loginImage" | "sidebarImage" | "browserIcon",
  extension: string
) {
  switch (kind) {
    case "loginImage":
      return `login${extension}`
    case "sidebarImage":
      return `sidebar${extension}`
    case "browserIcon":
      return `browser-icon${extension}`
  }
}

export function getCompanyAssetAbsolutePath(relativePath: string) {
  return path.join(getUploadsRoot(), relativePath)
}

export function inferContentType(filePath: string) {
  const extension = path.extname(filePath).toLowerCase()
  switch (extension) {
    case ".png":
      return "image/png"
    case ".jpg":
    case ".jpeg":
      return "image/jpeg"
    case ".webp":
      return "image/webp"
    case ".svg":
      return "image/svg+xml"
    case ".ico":
      return "image/x-icon"
    default:
      return "application/octet-stream"
  }
}

async function ensureDirectoryExists(directoryPath: string) {
  await mkdir(directoryPath, { recursive: true })
}

export async function saveCompanyAsset({
  slug,
  file,
  kind,
}: {
  slug: string
  file: File
  kind: "loginImage" | "sidebarImage" | "browserIcon"
}) {
  const extension = ALLOWED_IMAGE_TYPES.get(file.type)
  if (!extension) {
    throw new Error("Only PNG, JPG, WEBP, SVG, and ICO files are allowed.")
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  if (!buffer.length) {
    throw new Error("Uploaded file is empty.")
  }

  if (buffer.length > MAX_UPLOAD_BYTES) {
    throw new Error("Uploaded file is too large.")
  }

  const relativePath = getCompanyAssetRelativePath(
    slug,
    getCompanyAssetFilename(kind, extension)
  )
  const absolutePath = getCompanyAssetAbsolutePath(relativePath)
  await ensureDirectoryExists(path.dirname(absolutePath))
  await writeFile(absolutePath, buffer)

  return relativePath
}

export async function renameCompanyAssets(
  previousSlug: string,
  nextSlug: string
) {
  if (previousSlug === nextSlug) {
    return
  }

  const previousPath = path.join(getUploadsRoot(), "companies", previousSlug)
  const nextPath = path.join(getUploadsRoot(), "companies", nextSlug)
  await ensureDirectoryExists(path.dirname(nextPath))

  try {
    await access(previousPath)
  } catch {
    await ensureDirectoryExists(nextPath)
    return
  }

  await rename(previousPath, nextPath)
}

export async function readUploadFile(pathSegments: string[]) {
  const safeSegments = pathSegments.filter(
    (segment) => segment && segment !== "." && segment !== ".."
  )
  const absolutePath = path.join(getUploadsRoot(), ...safeSegments)

  if (!absolutePath.startsWith(getUploadsRoot())) {
    throw new Error("Invalid upload path.")
  }

  const buffer = await readFile(absolutePath)
  return {
    buffer,
    contentType: inferContentType(absolutePath),
  }
}
