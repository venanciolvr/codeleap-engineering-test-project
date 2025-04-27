import { useState, useEffect, useRef } from 'react';
import { useUser } from '../contexts/UserContext';
import { Toast } from './Toast';
import { FiEdit2, FiTrash2, FiHeart, FiMoreHorizontal, FiMessageCircle } from 'react-icons/fi';
import axios from 'axios';
import { useLocalStorage } from '../hooks/useLocalStorage';
import '../styles/Feed.css';

const API_BASE_URL = 'https://dev.codeleap.co.uk/careers/';
const LIKES_STORAGE_KEY = 'codeleap_likes';
const COMMENTS_STORAGE_KEY = 'codeleap_comments';

interface Post {
  id: number;
  username: string;
  title: string;
  content: string;
  created_datetime: string;
  likes: string[]; // Array of usernames who liked the post
  comments: Comment[];
}

interface EditingPost {
  id: number;
  title: string;
  content: string;
}

interface Toast {
  message: string;
  type: 'success' | 'error';
}

interface Comment {
  id: number;
  username: string;
  text: string;
  created_at: string;
}

export function Feed() {
  const { username } = useUser();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingPost, setEditingPost] = useState<EditingPost | null>(null);
  const [deletePostId, setDeletePostId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [commentInputs, setCommentInputs] = useState<{ [postId: number]: string }>({});
  const [editingComment, setEditingComment] = useState<{ id: number; text: string } | null>(null);
  const [openCommentMenu, setOpenCommentMenu] = useState<number | null>(null);
  const [openCommentInput, setOpenCommentInput] = useState<number | null>(null);
  const commentIdRef = useRef(1);
  const textareaRefs = useRef<{ [postId: number]: HTMLTextAreaElement | null }>({});

  // Use the custom hook for likes and comments
  const [storedLikes, setStoredLikes] = useLocalStorage<{ [key: number]: string[] }>(LIKES_STORAGE_KEY, {});
  const [storedComments, setStoredComments] = useLocalStorage<{ [key: number]: Comment[] }>(COMMENTS_STORAGE_KEY, {});

  const isFormValid = (title: string, content: string) => {
    return title.trim() !== '' && content.trim() !== '';
  };

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  };

  const fetchPosts = async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      const sortedPosts = response.data.results.map((post: any) => ({
        ...post,
        likes: storedLikes[post.id] || [],
        comments: storedComments[post.id] || []
      })).sort((a: Post, b: Post) => 
        new Date(b.created_datetime).getTime() - new Date(a.created_datetime).getTime()
      );
      setPosts(sortedPosts);
    } catch (error) {
      console.error('Error fetching posts:', error);
      showToast('Failed to load posts', 'error');
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.comment-menu')) {
        setOpenCommentMenu(null);
      }
    };
    if (openCommentMenu !== null) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [openCommentMenu]);

  // Auto-resize textarea for comments
  useEffect(() => {
    Object.values(textareaRefs.current).forEach((textarea) => {
      if (textarea) {
        textarea.style.height = 'auto';
        textarea.style.height = textarea.scrollHeight + 'px';
      }
    });
  }, [commentInputs, openCommentInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid(title, content)) return;

    setIsLoading(true);
    try {
      const response = await axios.post(API_BASE_URL, {
        username,
        title,
        content
      });

      // Create a new post object with the response data and empty likes/comments
      const newPost: Post = {
        ...response.data,
        likes: [],
        comments: []
      };

      setPosts(prevPosts => [newPost, ...prevPosts]);
      setTitle('');
      setContent('');
      showToast('Post created successfully!', 'success');
    } catch (error) {
      console.error('Error creating post:', error);
      showToast('Failed to create post', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPost || !isFormValid(editingPost.title, editingPost.content)) return;

    setIsLoading(true);
    try {
      const response = await axios.patch(`${API_BASE_URL}${editingPost.id}/`, {
        title: editingPost.title,
        content: editingPost.content
      });

      // Update the post while preserving likes and comments
      setPosts(prevPosts => 
        prevPosts.map(post => 
          post.id === editingPost.id 
            ? { ...response.data, likes: post.likes, comments: post.comments }
            : post
        )
      );
      
      setEditingPost(null);
      showToast('Post updated successfully!', 'success');
    } catch (error) {
      console.error('Error editing post:', error);
      showToast('Failed to update post', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletePostId) return;

    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}${deletePostId}/`);
      setPosts(prevPosts => prevPosts.filter(post => post.id !== deletePostId));
      setDeletePostId(null);
      showToast('Post deleted successfully!', 'success');
    } catch (error) {
      console.error('Error deleting post:', error);
      showToast('Failed to delete post', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleLike = (postId: number) => {
    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(post => {
        if (post.id === postId) {
          const newLikes = post.likes.includes(username)
            ? post.likes.filter(user => user !== username)
            : [...post.likes, username];
          return { ...post, likes: newLikes };
        }
        return post;
      });

      // Update stored likes
      const newStoredLikes = { ...storedLikes };
      updatedPosts.forEach(post => {
        newStoredLikes[post.id] = post.likes;
      });
      setStoredLikes(newStoredLikes);

      return updatedPosts;
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isPostOwner = (postUsername: string) => {
    return username && postUsername && username.trim().toLowerCase() === postUsername.trim().toLowerCase();
  };

  const handleAddComment = (postId: number) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;

    const newComment: Comment = {
      id: commentIdRef.current++,
      username: username || 'You',
      text,
      created_at: new Date().toISOString()
    };

    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(post => {
        if (post.id === postId) {
          const newComments = [...post.comments, newComment];
          return {
            ...post,
            comments: newComments
          };
        }
        return post;
      });

      // Update stored comments
      const newStoredComments = { ...storedComments };
      updatedPosts.forEach(post => {
        newStoredComments[post.id] = post.comments;
      });
      setStoredComments(newStoredComments);

      return updatedPosts;
    });

    setCommentInputs(inputs => ({ ...inputs, [postId]: '' }));
  };

  const handleEditComment = (postId: number, commentId: number, text: string) => {
    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.map(comment => 
              comment.id === commentId ? { ...comment, text } : comment
            )
          };
        }
        return post;
      });

      // Update stored comments
      const newStoredComments = { ...storedComments };
      updatedPosts.forEach(post => {
        newStoredComments[post.id] = post.comments;
      });
      setStoredComments(newStoredComments);

      return updatedPosts;
    });
    setEditingComment(null);
  };

  const handleDeleteComment = (postId: number, commentId: number) => {
    setPosts(prevPosts => {
      const updatedPosts = prevPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comments: post.comments.filter(comment => comment.id !== commentId)
          };
        }
        return post;
      });

      // Update stored comments
      const newStoredComments = { ...storedComments };
      updatedPosts.forEach(post => {
        newStoredComments[post.id] = post.comments;
      });
      setStoredComments(newStoredComments);

      return updatedPosts;
    });
  };

  return (
    <div className="feed-container">
      <header className="feed-header">
        <div className="feed-header-content">
          <h1>CodeLeap Network</h1>
        </div>
      </header>
      <div className="profile-area">
        <div className="profile-avatar">{username?.[0]?.toUpperCase() || '?'}</div>
        <div className="profile-info">
          <span className="profile-label">Logged in as:</span>
          <span className="profile-username">{username}</span>
        </div>
      </div>
      <main className="feed-content">
        <div className="feed-content-inner">
          <form onSubmit={handleSubmit} className="post-form">
            <h2>What's on your mind?</h2>
            
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Hello world"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="content">Content</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Content here"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-actions">
              <button
                type="submit"
                disabled={!isFormValid(title, content) || isLoading}
                className="submit-button"
              >
                {isLoading ? 'Creating...' : 'Create'}
              </button>
            </div>
          </form>

          <div className="posts-list">
            {posts.map(post => (
              <div key={post.id} className="post-card">
                <div className="post-header">
                  <h3>{post.title}</h3>
                  <div className="post-actions">
                    <span className="post-username">@{post.username}</span>
                    {isPostOwner(post.username) && (
                      <div className="post-buttons">
                        <button
                          onClick={() => {
                            setEditingPost({
                              id: post.id,
                              title: post.title,
                              content: post.content
                            });
                          }}
                          className="action-button"
                          title="Edit"
                          aria-label="Edit post"
                          disabled={isLoading || isDeleting}
                        >
                          <FiEdit2 size={18} />
                        </button>
                        <button
                          onClick={() => setDeletePostId(post.id)}
                          className="action-button delete"
                          title="Delete"
                          aria-label="Delete post"
                          disabled={isLoading || isDeleting}
                        >
                          <FiTrash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <div className="post-content">
                  <p>{post.content}</p>
                  <div className="post-date">{formatDate(post.created_datetime)}</div>
                  <div className="post-footer">
                    <button
                      onClick={() => handleLike(post.id)}
                      className={`like-button ${post.likes.includes(username) ? 'liked' : ''}`}
                      aria-label={`Like post. ${post.likes.includes(username) ? 'Liked' : 'Not liked'}`}
                    >
                      <FiHeart size={16} className="heart-icon" />
                      <span>{post.likes.includes(username) ? 'Liked' : 'Like'}</span>
                      <span className="likes-count">({post.likes.length})</span>
                    </button>
                    <button
                      onClick={() => setOpenCommentInput(openCommentInput === post.id ? null : post.id)}
                      className="comment-toggle-btn"
                      aria-label="Add a comment"
                    >
                      <FiMessageCircle size={16} style={{ marginRight: 6, marginBottom: -2 }} />
                      Comment
                      <span className="comments-count">({post.comments.length})</span>
                    </button>
                  </div>
                  {(post.comments.length > 0 || openCommentInput === post.id) && (
                    <div className={`comments-section ${post.comments.length > 0 ? 'has-comments' : ''}`}>
                      {post.comments.length > 0 && (
                        <ul className="comments-list">
                          {post.comments.map(comment => (
                            <li key={comment.id} className="comment-item">
                              {editingComment && editingComment.id === comment.id ? (
                                <div className="comment-edit-form">
                                  <textarea
                                    className="comment-edit-input"
                                    value={editingComment.text}
                                    onChange={e => setEditingComment({ ...editingComment, text: e.target.value })}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleEditComment(post.id, comment.id, editingComment.text);
                                      }
                                    }}
                                  />
                                  <div className="modal-actions">
                                    <button
                                      type="button"
                                      onClick={() => setEditingComment(null)}
                                      className="cancel-button"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleEditComment(post.id, comment.id, editingComment.text)}
                                      className="save-button"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <span className="comment-main">
                                    <span className="comment-username">{comment.username}:</span> {comment.text}
                                  </span>
                                  {comment.username === username && (
                                    <div className="comment-menu">
                                      <button
                                        className="comment-menu-btn"
                                        onClick={() => setOpenCommentMenu(openCommentMenu === comment.id ? null : comment.id)}
                                        aria-label="Open comment actions menu"
                                      >
                                        <FiMoreHorizontal size={18} />
                                      </button>
                                      {openCommentMenu === comment.id && (
                                        <div className="comment-menu-dropdown">
                                          <button className="comment-menu-item" onClick={() => { setEditingComment({ id: comment.id, text: comment.text }); setOpenCommentMenu(null); }}>Edit</button>
                                          <button className="comment-menu-item" onClick={() => { handleDeleteComment(post.id, comment.id); setOpenCommentMenu(null); }}>Delete</button>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                      {openCommentInput === post.id && (
                        <div className="add-comment-form">
                          <textarea
                            className="add-comment-input"
                            ref={el => { textareaRefs.current[post.id] = el; }}
                            rows={3}
                            style={{ resize: 'none' }}
                            placeholder="Add a comment..."
                            value={commentInputs[post.id] || ''}
                            onChange={e => setCommentInputs(inputs => ({ ...inputs, [post.id]: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAddComment(post.id); } }}
                          />
                          <button className="add-comment-btn" onClick={() => handleAddComment(post.id)}>Send</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {editingPost && (
        <div className="modal-overlay">
          <div className="modal-content edit-modal">
            <h2>Edit item</h2>
            <form onSubmit={handleEdit}>
              <div className="form-group">
                <label htmlFor="edit-title">Title</label>
                <input
                  type="text"
                  id="edit-title"
                  value={editingPost.title}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    title: e.target.value
                  })}
                  placeholder="Hello world"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="form-group">
                <label htmlFor="edit-content">Content</label>
                <textarea
                  id="edit-content"
                  value={editingPost.content}
                  onChange={(e) => setEditingPost({
                    ...editingPost,
                    content: e.target.value
                  })}
                  placeholder="Content here"
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setEditingPost(null)}
                  className="cancel-button"
                  disabled={isLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="save-button"
                  disabled={!isFormValid(editingPost.title, editingPost.content) || isLoading}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletePostId && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <h2>Are you sure you want to delete this item?</h2>
            <div className="modal-actions">
              <button
                onClick={() => setDeletePostId(null)}
                className="cancel-button"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="delete-button"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
} 