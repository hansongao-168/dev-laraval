使用 gh CLI 查看 hansongao-168/dev-laraval 仓库的现有 PR 列表

实施步骤:
1. 运行 `gh repo view hansongao-168/dev-laraval --json name,nameWithOwner,isPrivate,defaultBranchRef` 验证仓库可达性与权限
2. 运行 `gh pr list --repo hansongao-168/dev-laraval --limit 50 --state all --json number,title,author,state,baseRefName,headRefName,url,createdAt,updatedAt,isDraft,labels,reviewDecision` 获取完整 PR 列表
3. 运行 `gh pr list --repo hansongao-168/dev-laraval --state open --json number,title,url` 高亮显示当前打开的 PR
4. 在终端以表格形式呈现:编号、标题、作者、状态、目标分支、是否草稿、URL
5. 若列表为空,明确告知用户「该仓库目前没有 Pull Request」
6. 询问用户是否需要进一步操作(如查看某个 PR 详情、检出分支、创建新 PR 等)

前置条件(均已满足):
- gh CLI v2.96.0 已安装
- 已登录 GitHub 账户 hansongao-168
- token 包含 repo 作用域
- 本地仓库已绑定 hansongao-168/dev-laraval

本次只做只读查询,不修改任何配置、不推送、不创建新 PR。