import { useNavigate } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { supabase } from '@/supabase/supabaseClient';
import "./create_listing.css"; 

const CreateListing = () => { 
    const navigate = useNavigate();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(false);
    const [suggestion, setSuggestion] = useState({ price: null, source: '' });
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [userId, setUserId] = useState(null);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        price: '',
        category_id: '',
        condition: 'good',
        listing_type: 'sale'
    });

    // Monitors the session so we know which student is posting
    useEffect(() => {
        const fetchCategories = async () => {
            const { data } = await supabase.from('categories').select('*');
            setCategories(data || []);
        };
        fetchCategories();

        const checkSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setUserId(session?.user?.id || null);
        };
        checkSession();

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUserId(session?.user?.id || null);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    // Logs the user out and clears the history to prevent back-button access
    const handleLogout = async () => {
        await supabase.auth.signOut();
        localStorage.removeItem("user");
        navigate("/auth", { replace: true });
    };

    const handlePriceSuggestion = (catId) => {
        const selectedCat = categories.find(c => c.id === catId);
        if (!selectedCat) return;

        const title = formData.title.toLowerCase();
        let marketBasePrice = 300; 

       
        if (selectedCat.name === 'Electronics') {
            if (title.includes('laptop') || title.includes('macbook')) marketBasePrice = 8000;
            else if (title.includes('phone') || title.includes('iphone')) marketBasePrice = 5000;
            else if (title.includes('headphone') || title.includes('jbl')) marketBasePrice = 1200;
            else marketBasePrice = 1500; 
        } 
        else if (selectedCat.name === 'Textbooks') {
            if (title.includes('engineering') || title.includes('medicine')) marketBasePrice = 900;
            else marketBasePrice = 500; 
        }
        else if (selectedCat.name === 'Clothing') {
            if (title.includes('jacket') || title.includes('shoes')) marketBasePrice = 800;
            else marketBasePrice = 250; 
        }

        let baseMultiplier = 0.5; 
        if (formData.condition === 'new') baseMultiplier = 0.90;
        else if (formData.condition === 'like_new') baseMultiplier = 0.75;
        else if (formData.condition === 'poor') baseMultiplier = 0.25;

        let finalMultiplier = baseMultiplier;
        let source = "General Market Estimate";

        if (selectedCat.name === 'Textbooks') {
            finalMultiplier = baseMultiplier * 1.08; 
            source = "Stats SA P0141: Adjusted for high campus demand";
        } 
        else if (selectedCat.name === 'Electronics') {
            finalMultiplier = baseMultiplier * 0.90; 
            source = "Market Trend: Tech depreciation (Electronics lose value 10% faster)";
        }

        setSuggestion({ 
            price: (marketBasePrice * finalMultiplier).toFixed(2), 
            source 
        }); 
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const { data: { session } } = await supabase.auth.getSession();
        const activeUser = session?.user || userId;
        
        if (!activeUser) {
            alert("Please log in again to post.");
            return;
        }

        if (!formData.category_id || selectedFiles.length === 0) {
            alert("Please complete the category and image fields.");
            return;
        }

        setLoading(true);

        try {
            const imageUrls = [];
            for (const file of selectedFiles) {
                const filePath = `${Date.now()}_${file.name}`; 
                const { error: uploadError } = await supabase.storage.from('listing-images').upload(filePath, file);
                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('listing-images').getPublicUrl(filePath);
                imageUrls.push(publicUrl);
            }

            const { data: listingData, error: listingError } = await supabase.from('listings').insert([{
                user_id: activeUser.id,
                category_id: formData.category_id,
                title: formData.title,
                description: formData.description,
                condition: formData.condition,
                price: formData.listing_type === 'trade' ? null : parseFloat(formData.price || 0), 
                listing_type: formData.listing_type,
                status: 'active'
            }]).select();

            if (listingError) throw listingError;

            const listingId = listingData[0].id;
            const imageRecords = imageUrls.map((url, index) => ({
                listing_id: listingId,
                image_url: url,
                display_order: index
            }));

            await supabase.from('listing_images').insert(imageRecords);
            alert("Listing posted successfully!");
            
        
            navigate('/basket', { replace: true });
        } catch (err) {
            alert("Error: " + err.message);  
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="create-listing-page"> 
            <div className="form-scroll-container"> 
                <div className="form-card">
                    <h2 style={{ marginTop: 0 }}>Create New Listing</h2>
                    <form onSubmit={handleSubmit}>
                        <div className="input-group">
                            <label>Item Name</label>
                            <input 
                                placeholder="e.g. Engineering Maths Textbook" 
                                required
                                value={formData.title}
                                onChange={(e) => {
                                    setFormData({...formData, title: e.target.value});
                                    if(formData.category_id) handlePriceSuggestion(formData.category_id);
                                }}
                            />
                        </div>

                        <div className="input-group">
                            <label>Description</label>
                            <textarea 
                                placeholder="Condition, edition, etc." 
                                required
                                value={formData.description}
                                onChange={(e) => setFormData({...formData, description: e.target.value})}
                            />
                        </div>

                        <div className="row">
                            <div className="input-group">
                                <label>Condition</label>
                                <select value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                                    <option value="new">New</option>
                                    <option value="like_new">Like New</option>
                                    <option value="good">Good</option>
                                    <option value="fair">Fair</option>
                                    <option value="poor">Poor</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Listing Type</label>
                                <select value={formData.listing_type} onChange={(e) => setFormData({...formData, listing_type: e.target.value})}>
                                    <option value="sale">For Sale</option>
                                    <option value="trade">Swap</option>
                                    <option value="either">Either</option>
                                </select>
                            </div>
                        </div>

                        <div className="input-group">
                            <label>Price (R)</label>
                            <input 
                                type="number"
                                step="0.01" 
                                min="0"
                                placeholder={formData.listing_type === 'trade' ? "No price for swaps" : "0.00"}
                                value={formData.listing_type === 'trade' ? '' : formData.price} 
                                disabled={formData.listing_type === 'trade'} 
                                onChange={(e) => setFormData({...formData, price: e.target.value})}
                                required={formData.listing_type === 'sale'} // Only required for pure sales
                            />
                        </div>

                        <div className="input-group">
                            <label>Category</label>
                            <select 
                                required
                                value={formData.category_id}
                                onChange={(e) => {
                                    setFormData({...formData, category_id: e.target.value});
                                    handlePriceSuggestion(e.target.value);
                                }}
                            >
                                <option value="">Select Category</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                            </select>
                            
                            {suggestion.price && formData.listing_type !== 'trade' && (
                                <div className="suggestion">
                                    <strong>💡 Suggested: R{suggestion.price}</strong>
                                    <div style={{fontSize: '11px', color: '#555'}}>{suggestion.source}</div>
                                </div>
                            )}
                        </div>

                        <div className="input-group">
                            <label>Product Image</label>
                            <input 
                                type="file" 
                                multiple 
                                onChange={(e) => setSelectedFiles(Array.from(e.target.files))} 
                            />
                        </div>

                        <button type="submit" className="btn-post" disabled={loading}>
                            {loading ? 'Posting...' : '🚀 Post Listing'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bottomNav">
               
                <button onClick={() => navigate("/basket", { replace: true })}>SHOP</button>
                <button className="activeBottom">SELL</button>
                <button onClick={() => navigate("/messages", { replace: true })}>MESSAGES</button>
                <button onClick={handleLogout} style={{ color: '#ff4d4d', fontWeight: 'bold' }}>LOGOUT</button>
            </div>
        </div>
    );
};

export default CreateListing;