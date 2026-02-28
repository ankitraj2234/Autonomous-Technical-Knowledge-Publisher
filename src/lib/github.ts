import { Octokit } from '@octokit/rest';

function getOctokit(): Octokit {
    const token = process.env.GITHUB_TOKEN;
    if (!token) throw new Error('GITHUB_TOKEN environment variable is not set');
    return new Octokit({ auth: token });
}

function getRepoInfo() {
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    if (!owner || !repo) {
        throw new Error('GITHUB_OWNER and GITHUB_REPO must be set');
    }
    return { owner, repo };
}

/**
 * Commit a single file to the repository using the GitHub Contents API.
 * Creates or updates the file at the given path.
 */
export async function commitFile(
    filePath: string,
    content: string,
    commitMessage: string
): Promise<string> {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    // Check if file already exists (to get its SHA for updates)
    let existingSha: string | undefined;
    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: filePath,
        });
        if (!Array.isArray(data) && data.type === 'file') {
            existingSha = data.sha;
        }
    } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status !== 404) throw error;
        // File doesn't exist, that's fine
    }

    const encodedContent = Buffer.from(content, 'utf-8').toString('base64');

    const response = await octokit.repos.createOrUpdateFileContents({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        content: encodedContent,
        sha: existingSha,
    });

    return response.data.commit.sha || '';
}

/**
 * Commit a knowledge article to the proper category folder.
 */
export async function commitArticle(
    category: string,
    filename: string, // this will now receive the properly-cased title
    content: string,
    title: string
): Promise<string> {
    const categoryFolder = category.replace(/[<>:"/\\|?*]+/g, '').trim();
    const filePath = `Knowledge/${categoryFolder}/${filename}.md`;
    const commitMessage = `docs: add article on ${title}`;
    return commitFile(filePath, content, commitMessage);
}

/**
 * Commit a manual note (TXT file) to the notes folder.
 */
export async function commitNote(
    filename: string,
    content: string,
    action: 'create' | 'update'
): Promise<string> {
    const filePath = `notes/${filename}`;
    const commitMessage =
        action === 'create'
            ? `notes: create ${filename}`
            : `notes: update ${filename}`;
    return commitFile(filePath, content, commitMessage);
}

/**
 * Delete a file from the repository.
 */
export async function deleteFile(
    filePath: string,
    commitMessage: string
): Promise<void> {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    // Get file SHA
    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
    });

    if (Array.isArray(data) || data.type !== 'file') {
        throw new Error('Path is not a file');
    }

    await octokit.repos.deleteFile({
        owner,
        repo,
        path: filePath,
        message: commitMessage,
        sha: data.sha,
    });
}

/**
 * Delete a manual note from the notes folder.
 */
export async function deleteNote(filename: string): Promise<void> {
    const filePath = `notes/${filename}`;
    return deleteFile(filePath, `notes: delete ${filename}`);
}

/**
 * List all files in a directory in the repo.
 */
export async function listRepoFiles(
    dirPath: string
): Promise<Array<{ name: string; path: string; size: number; sha: string }>> {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    try {
        const { data } = await octokit.repos.getContent({
            owner,
            repo,
            path: dirPath,
        });

        if (!Array.isArray(data)) return [];

        return data
            .filter(item => item.type === 'file')
            .map(item => ({
                name: item.name,
                path: item.path,
                size: item.size || 0,
                sha: item.sha,
            }));
    } catch (error: unknown) {
        const err = error as { status?: number };
        if (err.status === 404) return [];
        throw error;
    }
}

/**
 * Get file content from the repo.
 */
export async function getFileContent(filePath: string): Promise<string> {
    const octokit = getOctokit();
    const { owner, repo } = getRepoInfo();

    const { data } = await octokit.repos.getContent({
        owner,
        repo,
        path: filePath,
    });

    if (Array.isArray(data) || data.type !== 'file') {
        throw new Error('Path is not a file');
    }

    return Buffer.from(data.content || '', 'base64').toString('utf-8');
}
