// const OSS = require('./workflow_modules/node_modules/ali-oss');
const path = require('path');
const { execSync } = require('child_process');

// List of directories to exclude from upload
const EXCLUDED_DIRS = ['workflow_modules', '.git', '.github', '.gitignore', 'node_modules', 'gallery', 'pdf'];

execSync('git fetch --all');
// Function to get the last pushed commit from the tag
function getLastPushedCommit() {
    try {
        // Check if the tag exists
        return execSync(`git rev-parse last-lw`).toString().trim();
    } catch (err) {
        console.log(`Tag not found, assuming this is the first run.`);
        return null;
    }
}

// Function to set the last pushed commit as a tag
function setLastPushedCommit() {
    try {
        // Get the current HEAD commit
        const currentCommit = execSync('git rev-parse HEAD').toString().trim();

        // Delete the old tag if it exists
        try {
            execSync(`git tag -d last-lw`);
            console.log(`Deleted previous last-lw`);
        } catch (err) {
            // If the tag doesn't exist, we can safely ignore this error
            console.log(`last-lw did not exist, creating a new one.`);
        }

        // Tag the current commit as the last pushed commit
        execSync(`git tag last-lw ${currentCommit}`);
        console.log(`Set last-lw to ${currentCommit}`);
    } catch (err) {
        console.error('Error setting last pushed commit:', err);
    }
}

// Function to check if a file is in excluded directories
function isFileExcluded(file) {
    return EXCLUDED_DIRS.some(dir => file.includes(dir));
}

// Function to get the modified files since the last push
function getModifiedFiles() {
    try {
        // Get the last pushed commit from the tag
        const lastPushedCommit = getLastPushedCommit();

        let changedFiles = [];

        // If there's no last pushed commit (first run), get all tracked files in the repository
        if (!lastPushedCommit) {
            console.log('No last pushed commit found, assuming first run.');
            // List all files in the repository
            changedFiles = execSync('git ls-files').toString().split('\n');
        } else {
            // Get the list of files changed from the last pushed commit to the current HEAD
            changedFiles = execSync(`git diff --name-only last-lw HEAD`).toString().split('\n');
        }

        // Filter out empty lines and files in EXCLUDED_DIRS
        return changedFiles.filter(file => file.trim() !== '' && !isFileExcluded(file));
    } catch (err) {
        console.error('Error getting changed files from Git:', err);
        return [];
    }
}

// Main function to handle file upload to OSS
async function uploadToOSS() {
    // const client = new OSS({
    //     region: process.env.OSS_ENDPOINT,
    //     accessKeyId: process.env.OSS_ACCESS_KEY_ID,
    //     accessKeySecret: process.env.OSS_ACCESS_KEY_SECRET,
    //     bucket: process.env.OSS_BUCKET,
    // });

    // Get the list of modified files using git diff or list all if it's the first run
    const modifiedFiles = getModifiedFiles();

    if (modifiedFiles.length === 0) {
        console.log('No files have been modified since the last commit.');
        return;
    }

    // Upload the modified files to OSS
    for (const filePath of modifiedFiles) {
        const relativePath = path.relative('.', filePath);  // Get relative path for upload

        try {
            console.log(`Uploading ${filePath} as ${relativePath} to OSS...`);
            // const result = await client.put(relativePath, filePath);  // Upload file to OSS
            // console.log(`File uploaded: ${result.url}`);
        } catch (err) {
            console.error(`Error uploading ${relativePath}:`, err);
        }
    }
}

// Run the upload process
uploadToOSS().catch(console.error);
setLastPushedCommit();
