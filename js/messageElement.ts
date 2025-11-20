import { getUserInfo, user, messageInput } from "./master"

export async function createMessageElement(msg, group = false) {
    const userInfo = await getUserInfo(msg.user_id)
    const selfInfo = await getUserInfo(user.id)
    const userName = msg.user_id === user.id ? selfInfo.username : userInfo.username

    const li = document.createElement('li')
    li.classList.add('message')
    li.style.position = 'relative'
    if (group) li.classList.add('message-grouped')
    li.dataset.messageId = msg.id

    const contentDiv = document.createElement('div')
    contentDiv.classList.add('message-content')

    // Show avatar + username only if NOT grouped
    // Inside createMessageElement(), replace header section with:
    if (!group) {
        const avatar = document.createElement('img')
        avatar.classList.add('message-avatar')
        avatar.src = userInfo.avatar_url || '../assets/images/default-avatar.png'
        avatar.alt = `${userName}'s avatar`
        li.appendChild(avatar)

        const headerDiv = document.createElement('div')
        headerDiv.classList.add('message-header')

        const usernameEl = document.createElement('div')
        usernameEl.classList.add('message-username')
        usernameEl.textContent = userName
        usernameEl.style.color = '#48BB78'

        headerDiv.appendChild(usernameEl)
        contentDiv.appendChild(headerDiv)
    }

    // Always create buttons container
    const buttonsContainer = document.createElement('div')
    buttonsContainer.style.display = 'none' // hidden by default
    buttonsContainer.style.position = 'absolute'
    buttonsContainer.style.right = '8px'
    buttonsContainer.style.top = '-30px'
    buttonsContainer.style.gap = '6px'
    buttonsContainer.style.background = '#3a3d42'
    buttonsContainer.style.padding = '8px 12px'
    buttonsContainer.style.borderRadius = '5px'
    buttonsContainer.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    buttonsContainer.style.backdropFilter = 'blur(6px)'
    buttonsContainer.style.transition = 'all 0.2s ease-in-out'
    buttonsContainer.style.zIndex = '1000'
    buttonsContainer.style.alignItems = 'center'

    buttonsContainer.classList.add('button-container')

    // --- REACT BUTTON ---
    const reactBtn = document.createElement('button')
    reactBtn.textContent = '😊'
    reactBtn.classList.add('reaction-btn')
    reactBtn.style.cursor = 'pointer'
    reactBtn.addEventListener('click', () => {
        console.log('React clicked for message', msg.id)
        // TODO: Open emoji picker or add reaction
    })

    // --- REPLY BUTTON ---
    const replyBtn = document.createElement('button')
    replyBtn.textContent = '↩️'
    replyBtn.classList.add('reply-btn')
    replyBtn.style.cursor = 'pointer'
    replyBtn.addEventListener('click', async () => {
        const replyUserInfo = await getUserInfo(msg.user_id)
        messageInput.dataset.replyTo = msg.id
        messageInput.focus()

        const previewBox = document.getElementById('reply-preview')
        const previewUser = document.getElementById('reply-user')
        const previewText = document.getElementById('reply-text')

        previewUser.textContent = replyUserInfo.username
        previewText.textContent = msg.content.length > 50 ? msg.content.slice(0, 50) + "..." : msg.content
        previewBox.style.display = 'block'
    })

    // --- MORE MENU BUTTON ---
    const moreBtn = document.createElement('button')
    moreBtn.textContent = '⋯'
    moreBtn.classList.add('more-btn')
    moreBtn.style.cursor = 'pointer'

    // Dropdown menu for "more"
    const moreMenu = document.createElement('div')
    moreMenu.style.display = 'none'
    moreMenu.style.position = 'absolute'
    moreMenu.style.top = '28px'
    moreMenu.style.right = '0'
    moreMenu.style.background = 'rgba(0,0,0,0.9)'
    moreMenu.style.borderRadius = '8px'
    moreMenu.style.padding = '4px 0'
    moreMenu.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    moreMenu.style.flexDirection = 'column'
    moreMenu.style.minWidth = '120px'
    moreMenu.style.zIndex = '1001'

    // Example items
    const deleteItem = document.createElement('div')
    deleteItem.textContent = '🗑️ Delete'
    deleteItem.style.padding = '6px 12px'
    deleteItem.style.cursor = 'pointer'
    deleteItem.style.color = '#ff0000'
    deleteItem.addEventListener('click', () => deleteMessage(msg.id, li))

    const reportItem = document.createElement('div')
    reportItem.textContent = '⚠️ Report'
    reportItem.style.padding = '6px 12px'
    reportItem.style.cursor = 'pointer'
    reportItem.addEventListener('click', () => alert('Reported message ' + msg.id))

    moreMenu.appendChild(deleteItem)
    moreMenu.appendChild(reportItem)
    buttonsContainer.appendChild(reactBtn)
    buttonsContainer.appendChild(replyBtn)
    buttonsContainer.appendChild(moreBtn)
    buttonsContainer.appendChild(moreMenu)

    // Toggle dropdown
    moreBtn.addEventListener('click', (e) => {
        e.stopPropagation()
        moreMenu.style.display = moreMenu.style.display === 'flex' ? 'none' : 'flex'
    })

    // Hide menu when clicking outside
    document.addEventListener('click', () => { moreMenu.style.display = 'none' })

    // Show/hide buttons on hover
    li.addEventListener('mouseenter', () => { buttonsContainer.style.display = 'flex' })
    li.addEventListener('mouseleave', () => { buttonsContainer.style.display = 'none' })

    // Append container to message
    li.appendChild(buttonsContainer)

    // MESSAGE TEXT
    const textEl = document.createElement('div')
    textEl.classList.add('message-text')
    if (msg.content.startsWith('__img__')) {
        textEl.innerHTML = `<img src="${msg.content.replace('__img__', '')}" alt="Image" style="max-width:300px;border-radius:8px;margin-top:5px;" />`
    } else {
        textEl.innerHTML = parseLinks(msg.content)
    }
    contentDiv.appendChild(textEl)
    li.appendChild(contentDiv)

    // Reply preview
    if (msg.reply_to) {
        try {
            const { data: replyData, error: replyError } = await supabase
                .from('messages')
                .select('content, user_id')
                .eq('id', msg.reply_to)
                .single()

            if (!replyError && replyData) {
                const replyUserInfo = await getUserInfo(replyData.user_id) // <- make sure we await this
                const replyDiv = document.createElement('div')
                replyDiv.classList.add('message-reply')
                replyDiv.textContent = `↪ @${replyUserInfo.username}: ${replyData.content.slice(0, 50)}${replyData.content.length > 50 ? "..." : ""}`
                replyDiv.style.fontStyle = 'italic'
                replyDiv.style.fontSize = '0.85em'
                replyDiv.style.marginBottom = '4px'

                // Insert **above** message text
                contentDiv.insertBefore(replyDiv, textEl)
            }
        } catch (err) {
            console.error("Failed to load reply message:", err)
        }
    }

    // Admin tools
    if (currentUserRole === "admin" && msg.user_id !== user.id && !group) {
        const adminDiv = document.createElement('div')
        adminDiv.classList.add('admin-tools')

        const deleteBtn = document.createElement('button')
        deleteBtn.textContent = "🗑️ Delete"
        deleteBtn.addEventListener('click', () => deleteMessage(msg.id, li))

        const timeoutBtn = document.createElement('button')
        timeoutBtn.textContent = "⏱️ Timeout"
        timeoutBtn.addEventListener('click', () => timeoutUser(msg.user_id))

        adminDiv.appendChild(deleteBtn)
        adminDiv.appendChild(timeoutBtn)
        li.appendChild(adminDiv)
    }

    if (group) li.style.marginTop = '-4px'

    return li
}
