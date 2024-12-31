const fs = require('fs');
const path = require('path');

class StorageCleanup {
    constructor(options) {
        this.storageDir = options.storageDir;
        this.maxAgeInDays = options.maxAgeInDays || 7;
        this.maxSizeInGB = options.maxSizeInGB || 5;
        this.interval = null;
    }

    startCleanupJob(intervalMinutes = 60) {
        // Convert minutes to milliseconds
        const interval = intervalMinutes * 60 * 1000;
        
        this.interval = setInterval(() => {
            this.cleanup();
        }, interval);

        // Run initial cleanup
        this.cleanup();
    }

    stopCleanupJob() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    cleanup() {
        try {
            console.log('Starting storage cleanup...');
            
            // Check if directory exists
            if (!fs.existsSync(this.storageDir)) {
                console.log('Storage directory does not exist:', this.storageDir);
                return;
            }

            const files = fs.readdirSync(this.storageDir);
            const now = new Date();
            let totalSize = 0;

            // Get file stats and calculate total size
            const fileStats = files.map(file => {
                const filePath = path.join(this.storageDir, file);
                const stats = fs.statSync(filePath);
                return {
                    path: filePath,
                    name: file,
                    size: stats.size,
                    created: stats.birthtime
                };
            });

            // Sort files by creation date (oldest first)
            fileStats.sort((a, b) => a.created - b.created);

            for (const file of fileStats) {
                const ageInDays = (now - file.created) / (1000 * 60 * 60 * 24);
                totalSize += file.size;

                // Delete if file is too old
                if (ageInDays > this.maxAgeInDays) {
                    this.deleteFile(file.path);
                    console.log(`Deleted old file: ${file.name} (${ageInDays.toFixed(1)} days old)`);
                    continue;
                }

                // If total size exceeds limit, start deleting oldest files
                if (totalSize > this.maxSizeInGB * 1024 * 1024 * 1024) {
                    this.deleteFile(file.path);
                    console.log(`Deleted file due to space limit: ${file.name}`);
                    totalSize -= file.size;
                }
            }

            console.log('Storage cleanup completed');
        } catch (error) {
            console.error('Error during storage cleanup:', error);
        }
    }

    deleteFile(filePath) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error(`Error deleting file ${filePath}:`, error);
        }
    }
}

module.exports = StorageCleanup; 