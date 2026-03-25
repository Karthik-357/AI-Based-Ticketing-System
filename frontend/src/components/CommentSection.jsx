import React, { useState, useEffect } from 'react';

const CommentSection = ({ ticketId, ticketStatus }) => {
    const isClosed = ticketStatus === "CLOSED";
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

    if (loading) return <div className="py-8 text-slate-400 font-medium text-center italic">Loading comments...</div>;

    return (
        <div className="mt-10 mb-6">
            <h2 className="text-xl font-bold mb-6 text-slate-800 tracking-tight flex items-center gap-2">
                Comments & Activity
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-sm rounded-full">{comments.length}</span>
            </h2>

            {/* Comments List */}
            <div className="space-y-4 mb-8">
                {comments.length === 0 ? (
                    <p className="text-slate-400 text-sm font-medium italic p-6 bg-slate-50/50 rounded-xl text-center border border-dashed border-slate-200">No comments yet. Start the conversation!</p>
                ) : (
                    comments.map((comment) => (
                        <div key={comment._id} className="p-5 rounded-xl bg-slate-50 border border-slate-100 shadow-sm relative group">
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="font-bold text-slate-800 text-sm">
                                        {comment.userId?.email || 'Unknown User'}
                                    </span>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${comment.userId?.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                                            comment.userId?.role === 'manager' ? 'bg-emerald-100 text-emerald-800' :
                                                comment.userId?.role === 'employee' ? 'bg-orange-100 text-orange-800' :
                                                    'bg-slate-100 text-slate-800'
                                        }`}>
                                        {comment.userId?.role || 'employee'}
                                    </span>
                                </div>
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {new Date(comment.createdAt).toLocaleString()}
                                </span>
                            </div>
                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Form */}
            {isClosed ? (
                <div className="glass-panel p-6 text-center border-dashed border-slate-200">
                    <p className="text-slate-400 text-sm font-medium italic">This ticket is closed. Comments are disabled.</p>
                </div>
            ) : (
                <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full pointer-events-none opacity-50"></div>
                    
                    <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider relative z-10">Add a Comment</h3>
                    <form onSubmit={handleSubmit} className="relative z-10">
                        <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            className="glass-input resize-y min-h-[100px] mb-4 text-sm"
                            placeholder="Type your comment or update here..."
                            required
                        />

                        <div className="flex justify-end items-center">
                            <button
                                type="submit"
                                disabled={submitting || !newComment.trim()}
                                className="glass-button-primary px-6 py-2.5 text-sm"
                            >
                                {submitting ? 'Posting...' : 'Post Comment'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default CommentSection;
