/** @type {import('next').NextConfig} */
const nextConfig = {
    reactCompiler: true,
    // Note: .next is a symlink to C:/Temp/face-attendance-next to work around
    // E: drive filesystem corruption (lmdb database fails with os error 1392)
    turbopack: {},
    // Disable TypeScript completely
    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;
