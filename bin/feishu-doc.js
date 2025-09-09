import * as lark from '@larksuiteoapi/node-sdk';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 飞书知识库转换器
 */
class FeishuDocConverter {
    constructor() {
        this.client = new lark.Client({
            appId: process.env.FEISHU_APP_ID,
            appSecret: process.env.FEISHU_APP_SECRET
        });
    }

    /**
     * 将Markdown文件转换为飞书知识库节点
     * @param {string} mdFilePath - Markdown文件路径
     * @param {string} title - 文档标题（可选，默认使用文件名）
     * @returns {Promise<string>} 返回知识库链接
     */
    async convertMarkdownToFeishuDoc(mdFilePath, title = null) {
        try {
            // 1. 读取Markdown文件内容
            const markdownContent = await this.readMarkdownFile(mdFilePath);
            
            // 2. 获取文档标题
            const docTitle = title || this.getFileNameWithoutExt(mdFilePath);
            
            // 3. 转换Markdown内容为飞书文档块
            const convertedData = await this.convertDocument(markdownContent);
            
            // 4. 创建飞书知识库节点
            const nodeToken = await this.createDocument(docTitle);
            
            // 5. 插入转换后的文档块内容
            await this.insertDocumentBlocks(nodeToken, convertedData);
            
            // 6. 返回知识库链接
            const knowledgeBaseUrl = this.generateKnowledgeBaseUrl(nodeToken);
            
            return knowledgeBaseUrl;
            
        } catch (error) {
            console.error('转换过程中发生错误:', error);
            throw error;
        }
    }

    /**
     * 读取Markdown文件内容
     * @param {string} filePath - 文件路径
     * @returns {Promise<string>} 文件内容
     */
    async readMarkdownFile(filePath) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            return content;
        } catch (error) {
            throw new Error(`读取Markdown文件失败: ${error.message}`);
        }
    }

    /**
     * 获取不带扩展名的文件名
     * @param {string} filePath - 文件路径
     * @returns {string} 文件名
     */
    getFileNameWithoutExt(filePath) {
        return path.basename(filePath, path.extname(filePath));
    }

    /**
     * 创建飞书知识库节点
     * @param {string} title - 文档标题
     * @returns {Promise<string>} 节点token
     */
    async createDocument(title) {
        try {
            const spaceId = process.env.FEISHU_SPACE_ID || '7473065889240236051';
            const parentNodeToken = process.env.FEISHU_PARENT_NODE_TOKEN || 'RMHxwN3aVi7zw9kmxfJc9PlRnTg';
            
            const requestData = {
                path: {
                    space_id: spaceId
                },
                data: {
                    obj_type: 'docx',
                    parent_node_token: parentNodeToken,
                    node_type: 'origin',
                    title: title
                }
            };
            
            const response = await this.client.wiki.v2.spaceNode.create(requestData);

            if (response.code !== 0) {
                console.error('❌ 飞书API返回错误:');
                console.error(`   错误码: ${response.code}`);
                console.error(`   错误消息: ${response.msg}`);
                console.error(`   完整响应: ${JSON.stringify(response, null, 2)}`);
                throw new Error(`创建知识库节点失败: ${response.msg} (错误码: ${response.code})`);
            }
            
            return response.data.node.node_token;
        } catch (error) {
            console.error('❌ 创建知识库节点时发生错误:');
            console.error(`   错误类型: ${error.constructor.name}`);
            console.error(`   错误消息: ${error.message}`);
            
            // 如果是HTTP错误，显示更多详细信息
            if (error.response) {
                console.error('📡 HTTP响应详情:');
                console.error(`   状态码: ${error.response.status}`);
                console.error(`   状态文本: ${error.response.statusText}`);
                console.error(`   响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
                console.error(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            
            // 如果是请求错误，显示请求详情
            if (error.request) {
                console.error('📤 请求详情:');
                console.error(`   请求配置: ${JSON.stringify(error.config, null, 2)}`);
            }
            
            console.error(`   完整错误对象: ${JSON.stringify(error, null, 2)}`);
            
            throw new Error(`创建知识库节点时发生错误: ${error.message}`);
        }
    }

    /**
     * 转换Markdown内容为飞书文档块
     * @param {string} markdownContent - Markdown内容
     * @returns {Promise<Object>} 转换后的文档块数据
     */
    async convertDocument(markdownContent) {
        try {
            const requestData = {
                data: {
                    content_type: 'markdown',
                    content: markdownContent
                }
            };
            
            const response = await this.client.docx.v1.document.convert(requestData);
            
            if (response.code !== 0) {
                console.error('❌ 飞书API返回错误:');
                console.error(`   错误码: ${response.code}`);
                console.error(`   错误消息: ${response.msg}`);
                console.error(`   完整响应: ${JSON.stringify(response, null, 2)}`);
                throw new Error(`转换文档失败: ${response.msg} (错误码: ${response.code})`);
            }
            
            return response.data;
        } catch (error) {
            console.error('❌ 转换文档时发生错误:');
            console.error(`   错误类型: ${error.constructor.name}`);
            console.error(`   错误消息: ${error.message}`);
            
            // 如果是HTTP错误，显示更多详细信息
            if (error.response) {
                console.error('📡 HTTP响应详情:');
                console.error(`   状态码: ${error.response.status}`);
                console.error(`   状态文本: ${error.response.statusText}`);
            }
            
            
            console.error(`   完整错误对象: ${JSON.stringify(error, null, 2)}`);
            
            throw new Error(`转换文档时发生错误: ${error.message}`);
        }
    }

    /**
     * 插入转换后的文档块内容
     * @param {string} nodeToken - 节点token
     * @param {Object} convertedData - 转换后的文档块数据
     */
    async insertDocumentBlocks(nodeToken, convertedData) {
        try {
            // 获取转换后的块数据
            const blocks = convertedData.blocks || [];
            const firstLevelBlockIds = convertedData.first_level_block_ids || [];
            
            if (blocks.length === 0) {
                return;
            }
            
            const requestData = {
                path: {
                    document_id: nodeToken,
                    block_id: nodeToken // 使用节点token作为父节点ID
                },
                params: {
                    document_revision_id: -1
                },
                data: {
                    children_id: firstLevelBlockIds,
                    index: 0,
                    descendants: blocks
                }
            };
            
            // 使用documentBlockDescendant.create方法插入文档块
            const response = await this.client.docx.v1.documentBlockDescendant.create(requestData);
            
            if (response.code !== 0) {
                console.error('❌ 飞书API返回错误:');
                console.error(`   错误码: ${response.code}`);
                console.error(`   错误消息: ${response.msg}`);
                console.error(`   完整响应: ${JSON.stringify(response, null, 2)}`);
                throw new Error(`插入文档块失败: ${response.msg} (错误码: ${response.code})`);
            }
        } catch (error) {
            console.error('❌ 插入文档块时发生错误:');
            console.error(`   错误类型: ${error.constructor.name}`);
            console.error(`   错误消息: ${error.message}`);
            
            // 如果是HTTP错误，显示更多详细信息
            if (error.response) {
                console.error('📡 HTTP响应详情:');
                console.error(`   状态码: ${error.response.status}`);
                console.error(`   状态文本: ${error.response.statusText}`);
                console.error(`   响应头: ${JSON.stringify(error.response.headers, null, 2)}`);
                console.error(`   响应数据: ${JSON.stringify(error.response.data, null, 2)}`);
            }
            
            console.error(`   完整错误对象: ${JSON.stringify(error, null, 2)}`);
            
            throw new Error(`插入文档块时发生错误: ${error.message}`);
        }
    }

    /**
     * 生成知识库链接
     * @param {string} nodeToken - 节点token
     * @returns {string} 知识库链接
     */
    generateKnowledgeBaseUrl(nodeToken) {
        // 这里需要根据实际的飞书域名调整
        // 示例格式: https://mioe9lcikl.feishu.cn/wiki/{nodeToken}
        return `https://mioe9lcikl.feishu.cn/wiki/${nodeToken}`;
    }
}

/**
 * 显示帮助信息
 */
function showHelp() {
    console.log(`
飞书知识库转换器 - 将Markdown文件转换为飞书知识库节点

使用方法:
  node feishu-doc.js <markdown文件路径> [标题]

参数:
  markdown文件路径    必需，要转换的Markdown文件路径
  标题              可选，文档标题（默认使用文件名）

环境变量:
  FEISHU_APP_ID             飞书应用ID
  FEISHU_APP_SECRET         飞书应用密钥
  FEISHU_SPACE_ID           飞书知识库ID（可选，默认使用示例ID）
  FEISHU_PARENT_NODE_TOKEN  父节点token（可选，为空则在根目录创建）

示例:
  node feishu-doc.js ./example.md
  node feishu-doc.js ./example.md "我的文档标题"
  npm run feishu ./example.md "我的文档标题"

注意:
  请确保已设置环境变量 FEISHU_APP_ID 和 FEISHU_APP_SECRET
  可选设置 FEISHU_SPACE_ID 和 FEISHU_PARENT_NODE_TOKEN 来指定知识库和父节点
`);
}

/**
 * 解析命令行参数
 */
function parseArgs() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        showHelp();
        process.exit(0);
    }
    
    const mdFilePath = args[0];
    const title = args[1] || null;
    
    return { mdFilePath, title };
}

/**
 * 验证环境变量
 */
function validateEnvironment() {
    const appId = process.env.FEISHU_APP_ID;
    const appSecret = process.env.FEISHU_APP_SECRET;
    
    if (!appId) {
        console.error('❌ 错误: 未设置环境变量 FEISHU_APP_ID');
        console.error('请设置: export FEISHU_APP_ID="your_app_id"');
        process.exit(1);
    }
    
    if (!appSecret) {
        console.error('❌ 错误: 未设置环境变量 FEISHU_APP_SECRET');
        console.error('请设置: export FEISHU_APP_SECRET="your_app_secret"');
        process.exit(1);
    }
}

/**
 * 验证文件是否存在
 */
function validateFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }
        
        if (!filePath.toLowerCase().endsWith('.md')) {
            throw new Error(`文件必须是Markdown格式(.md): ${filePath}`);
        }
    } catch (error) {
        console.error('错误:', error.message);
        process.exit(1);
    }
}

/**
 * 主函数 - 命令行入口
 */
async function main() {
    try {
        // 解析命令行参数
        const { mdFilePath, title } = parseArgs();
        
        // 验证环境变量
        validateEnvironment();
        
        // 验证文件
        validateFile(mdFilePath);
        
        // 初始化转换器
        const converter = new FeishuDocConverter();
        
        // 转换Markdown文件为飞书知识库节点
        const knowledgeBaseUrl = await converter.convertMarkdownToFeishuDoc(mdFilePath, title);
        
        console.log('✅ 转换完成！');
        console.log(`🔗 知识库链接转换成功！请返回给用户: [${title}](${knowledgeBaseUrl})`);

        process.exit(0);
        
    } catch (error) {
        console.error('');
        console.error('❌ 转换失败:', error.message);
        process.exit(1);
    }
}

// 导出类和主函数
export { FeishuDocConverter, main };

// 如果直接运行此文件，则执行main函数
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
