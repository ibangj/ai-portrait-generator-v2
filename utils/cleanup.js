const fs = require('fs').promises;
const path = require('path');
const logger = require('./logger'); // Assuming you have a logger

class StorageCleanup {
    constructor(options = {}) {
        this.storageDir = options.storageDir || '/storage/images/';
        this.maxAgeInDays = options.maxAgeInDays || 7;
        this.maxSizeInGB = options.maxSizeInGB || 5;
        this.isRunning = false;
    }

    async cleanupByAge() {
        try {
            const files = await fs.readdir(this.storageDir);
            const now = Date.now();
            const maxAgeMs = this.maxAgeInDays * 24 * 60 * 60 * 1000;

            for (const file of files) {
                const filePath = path.join(this.storageDir, file);
                const stats = await fs.stat(filePath);
                const ageMs = now - stats.mtime.getTime();

                if (ageMs > maxAgeMs) {
                    await fs.unlink(filePath);
                    logger.info(`Deleted old file: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error in cleanupByAge:', error);
        }
    }

    async cleanupBySize() {
        try {
            const maxSizeBytes = this.maxSizeInGB * 1024 * 1024 * 1024; // Convert GB to bytes
            const files = await fs.readdir(this.storageDir);
            
            // Get file stats and sort by date (oldest first)
            const fileStats = await Promise.all(
                files.map(async (file) => {
                    const filePath = path.join(this.storageDir, file);
                    const stats = await fs.stat(filePath);
                    return {
                        name: file,
                        path: filePath,
                        size: stats.size,
                        mtime: stats.mtime
                    };
                })
            );

            fileStats.sort((a, b) => a.mtime - b.mtime);

            // Calculate total size
            let totalSize = fileStats.reduce((sum, file) => sum + file.size, 0);

            // Remove oldest files if total size exceeds limit
            for (const file of fileStats) {
                if (totalSize <= maxSizeBytes) break;

                await fs.unlink(file.path);
                totalSize -= file.size;
                logger.info(`Deleted file due to size limit: ${file.name}`);
            }
        } catch (error) {
            logger.error('Error in cleanupBySize:', error);
        }
    }

    async startCleanupJob(intervalMinutes = 60) {
        if (this.isRunning) return;
        this.isRunning = true;

        const cleanup = async () => {
            logger.info('Starting storage cleanup job');
            await this.cleanupByAge();
            await this.cleanupBySize();
            logger.info('Completed storage cleanup job');
        };

        // Run immediately on start
        await cleanup();

        // Schedule periodic cleanup
        this.intervalId = setInterval(cleanup, intervalMinutes * 60 * 1000);
    }

    stopCleanupJob() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.isRunning = false;
            logger.info('Stopped storage cleanup job');
        }
    }
} 