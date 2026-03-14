import React, { useState, useEffect } from 'react';

const CommentSection = ({ ticketId }) => {
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    const fetchComments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/comments/${ticketId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                setComments(data);
            } else {
                console.error("Failed to fetch comments");
            }
        } catch (err) {
            console.error("Error fetching comments:", err);
            setError("Failed to load comments");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComments();
    }, [ticketId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/comments/${ticketId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    content: newComment
                })
            });

            if (res.ok) {
                setNewComment('');
                fetchComments();
            } else {
                alert("Failed to post comment");
            }
        } catch (err) {
            console.error("Error posting comment:", err);
            alert("Error posting comment");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="py-4 text-gray-500">Loading comments...</div>;

    return (
        <div className="mt-8 border-t pt-6">
            <h2 className="text-xl font-semibold mb-4">Comments & Activity</h2>

            {/* Comments List */}
            <div className="space-y-4 mb-8">
                {comments.length === 0 ? (
                    <p className="text-gray-500 italic">No comments yet.</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment._id} className="p-4 rounded-lg border bg-white border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-900">
                                        {comment.userId?.email || 'Unknown User'}
                                    </span>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${comment.userId?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            comment.userId?.role === 'manager' ? 'bg-emerald-100 text-emerald-800' :
                                                comment.userId?.role === 'employee' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-gray-100 text-gray-800'
                                        }`}>
                                        {comment.userId?.role || 'employee'}
                                    </span>
                                </div>
                                <span className="text-sm text-gray-500">
                                    {new Date(comment.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Form */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <h3 className="text-md font-medium mb-2">Add a Comment</h3>
                <form onSubmit={handleSubmit}>
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
                        rows="3"
                        placeholder="Type your comment here..."
                        required
                    />

                    <div className="flex justify-end items-center">
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                        >
                            {submitting ? 'Posting...' : 'Post Comment'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CommentSection;
