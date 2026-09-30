import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { apiClient } from '@/lib/apiClient';
import { PageHeader } from '@/components/ui/PageHeader';
import { Tabs, Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Table, Column } from '@/components/ui/Table';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ImageUploader } from '@/components/ui/ImageUploader';
import { formatDate } from '@/lib/format';
import type { HeroSlide, Review, BlogPost, FAQ, MediaAsset, ProductCategory, Subcategory } from '@/types';
import {
  Globe,
  Sliders,
  FileText,
  HelpCircle,
  Star,
  Image as ImageIcon,
  Plus,
  Trash2,
  Edit2,
  ExternalLink,
  Upload,
  FolderTree,
  Layout,
  CheckCircle,
  AlertCircle,
  Save,
  Info,
  Gift,
  BookOpen,
  Sparkles,
  Home,
  Gem,
} from 'lucide-react';

export const WebsitePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'home';

  const setActiveTab = (tab: string) => {
    setSearchParams({ tab });
  };

  // Modals state
  const [editingHero, setEditingHero] = useState<HeroSlide | null>(null);
  const [isHeroModalOpen, setIsHeroModalOpen] = useState(false);
  const [deletingHero, setDeletingHero] = useState<HeroSlide | null>(null);

  const [editingReview, setEditingReview] = useState<Review | null>(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [deletingReview, setDeletingReview] = useState<Review | null>(null);

  const [editingBlog, setEditingBlog] = useState<BlogPost | null>(null);
  const [isBlogModalOpen, setIsBlogModalOpen] = useState(false);
  const [deletingBlog, setDeletingBlog] = useState<BlogPost | null>(null);

  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [isFaqModalOpen, setIsFaqModalOpen] = useState(false);
  const [deletingFaq, setDeletingFaq] = useState<FAQ | null>(null);

  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [deletingCategory, setDeletingCategory] = useState<ProductCategory | null>(null);

  const [editingSubcategory, setEditingSubcategory] = useState<Subcategory | null>(null);
  const [isSubcategoryModalOpen, setIsSubcategoryModalOpen] = useState(false);
  const [deletingSubcategory, setDeletingSubcategory] = useState<Subcategory | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queries
  const { data: heroData, isLoading: heroLoading, refetch: refetchHero } = useQuery<{ slides: HeroSlide[] }>({
    queryKey: ['cms-hero-slides'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/hero-slides');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'home',
  });

  const { data: reviewsData, isLoading: reviewsLoading, refetch: refetchReviews } = useQuery<{ reviews: Review[] }>({
    queryKey: ['cms-reviews'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/reviews');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'reviews',
  });

  const { data: blogsData, isLoading: blogsLoading, refetch: refetchBlogs } = useQuery<{ posts: BlogPost[] }>({
    queryKey: ['cms-blogs'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/blog-posts');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'blogs',
  });

  const { data: faqsData, isLoading: faqsLoading, refetch: refetchFaqs } = useQuery<{ faqs: FAQ[] }>({
    queryKey: ['cms-faqs'],
    queryFn: async () => {
      const res = await apiClient.get('/cms/faqs');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'faqs',
  });

  const { data: categoriesData, isLoading: categoriesLoading, refetch: refetchCategories } = useQuery<{ categories: ProductCategory[] }>({
    queryKey: ['categories-full'],
    queryFn: async () => {
      const res = await apiClient.get('/categories');
      return res.data.data || res.data;
    },
    enabled: activeTab === 'collections',
  });

  const { data: settingsData, refetch: refetchSettings } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const res = await apiClient.get('/settings');
      return res.data.data || res.data;
    },
  });

  // Actions
  const handleToggleHeroActive = async (slide: HeroSlide) => {
    try {
      await apiClient.put(`/cms/hero-slides/${slide.id}`, { isActive: !slide.isActive });
      refetchHero();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleReviewPublish = async (review: Review) => {
    try {
      await apiClient.put(`/cms/reviews/${review.id}`, { isPublished: !review.isPublished });
      refetchReviews();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleBlogPublish = async (post: BlogPost) => {
    try {
      await apiClient.put(`/cms/blog-posts/${post.id}`, { isPublished: !post.isPublished });
      refetchBlogs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleFaqPublish = async (faq: FAQ) => {
    try {
      await apiClient.put(`/cms/faqs/${faq.id}`, { isPublished: !faq.isPublished });
      refetchFaqs();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteHero = async () => {
    if (!deletingHero) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/hero-slides/${deletingHero.id}`);
      setDeletingHero(null);
      refetchHero();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteReview = async () => {
    if (!deletingReview) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/reviews/${deletingReview.id}`);
      setDeletingReview(null);
      refetchReviews();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBlog = async () => {
    if (!deletingBlog) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/blog-posts/${deletingBlog.id}`);
      setDeletingBlog(null);
      refetchBlogs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteFaq = async () => {
    if (!deletingFaq) return;
    setIsSubmitting(true);
    try {
      await apiClient.delete(`/cms/faqs/${deletingFaq.id}`);
      setDeletingFaq(null);
      refetchFaqs();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deletingCategory) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/${deletingCategory.id}`);
      setDeletingCategory(null);
      refetchCategories();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete category.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSubcategory = async () => {
    if (!deletingSubcategory) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await apiClient.delete(`/categories/subcategories/${deletingSubcategory.id}`);
      setDeletingSubcategory(null);
      refetchCategories();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.message || 'Failed to delete subcategory.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Table Columns
  const reviewColumns: Column<Review>[] = [
    {
      header: 'Client & Rating',
      accessor: (row) => (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-graphite-900">{row.name}</span>
            {row.verified && (
              <span className="rounded-full bg-emerald-50 px-1.5 py-0.2 text-[10px] font-bold text-emerald-700">
                Verified
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 text-amber-500 mt-0.5">
            {[...Array(row.rating)].map((_, i) => (
              <Star key={i} className="h-3 w-3 fill-current" />
            ))}
          </div>
        </div>
      ),
    },
    {
      header: 'Review Quote',
      accessor: (row) => (
        <p className="text-xs text-graphite-600 max-w-md truncate italic">"{row.quote}"</p>
      ),
    },
    {
      header: 'Product',
      accessor: (row) => <span className="text-xs text-graphite-600">{row.productName || 'General Brand'}</span>,
    },
    {
      header: 'Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleReviewPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingReview(row); setIsReviewModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingReview(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const blogColumns: Column<BlogPost>[] = [
    {
      header: 'Title & Slug',
      accessor: (row) => (
        <div>
          <p className="font-bold text-graphite-900">{row.title}</p>
          <p className="text-xs font-mono text-graphite-400">/blogs/{row.slug}</p>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleBlogPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Date',
      accessor: (row) => <span className="text-xs text-graphite-500">{formatDate(row.createdAt)}</span>,
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingBlog(row); setIsBlogModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingBlog(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const faqColumns: Column<FAQ>[] = [
    {
      header: 'Question',
      accessor: (row) => <span className="font-bold text-graphite-900">{row.question}</span>,
    },
    {
      header: 'Context',
      accessor: (row) => (
        <span className="text-xs font-semibold text-graphite-700 uppercase tracking-wider">{row.context}</span>
      ),
    },
    {
      header: 'Status',
      accessor: (row) => (
        <button type="button" onClick={() => handleToggleFaqPublish(row)} className="cursor-pointer">
          <StatusBadge status={row.isPublished ? 'PUBLISHED' : 'DRAFT'} />
        </button>
      ),
    },
    {
      header: 'Actions',
      accessor: (row) => (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => { setEditingFaq(row); setIsFaqModalOpen(true); }}>
            <Edit2 className="h-3.5 w-3.5 mr-1" /> Edit
          </Button>
          <Button size="sm" variant="destructive" onClick={() => setDeletingFaq(row)}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Page Content Manager"
        description="Visual content editor for House of Seya website pages. Edit every visible text and replace every image."
      />

      {errorMsg && (
        <div className="rounded-lg bg-red-50 p-3 text-xs text-red-700 border border-red-200 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 border border-emerald-200 flex items-center gap-2">
          <CheckCircle className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Tabs Navigation */}
      <Tabs
        tabs={[
          { id: 'home', label: 'Home Page' },
          { id: 'about', label: 'About Page' },
          { id: 'gifting', label: 'Gifting Page' },
          { id: 'customise', label: 'Customise Page' },
          { id: 'diamond-education', label: 'Diamond Education' },
          { id: 'gold-vermeil', label: 'Gold Vermeil' },
          { id: 'blogs', label: 'Blogs' },
          { id: 'collections', label: 'Collections' },
          { id: 'faqs', label: 'FAQs' },
          { id: 'reviews', label: 'Reviews' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {/* 1. HOME PAGE */}
      {activeTab === 'home' && (
        <HomePageEditor
          settings={settingsData}
          heroSlides={heroData?.slides || []}
          heroLoading={heroLoading}
          onAddSlide={() => { setEditingHero(null); setIsHeroModalOpen(true); }}
          onEditSlide={(slide) => { setEditingHero(slide); setIsHeroModalOpen(true); }}
          onDeleteSlide={(slide) => setDeletingHero(slide)}
          onToggleSlideActive={handleToggleHeroActive}
          onSaved={() => {
            refetchSettings();
            refetchHero();
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 2. ABOUT PAGE */}
      {activeTab === 'about' && (
        <AboutPageContentEditor
          onSaved={() => {
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 3. GIFTING PAGE */}
      {activeTab === 'gifting' && (
        <GiftingPageContentEditor
          onSaved={() => {
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 4. CUSTOMISE PAGE */}
      {activeTab === 'customise' && (
        <CustomisePageContentEditor
          onSaved={() => {
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 5. DIAMOND EDUCATION */}
      {activeTab === 'diamond-education' && (
        <DiamondEducationContentEditor
          onSaved={() => {
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 6. GOLD VERMEIL */}
      {activeTab === 'gold-vermeil' && (
        <GoldVermeilContentEditor
          onSaved={() => {
            setSuccessMsg('Changes saved successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          }}
        />
      )}

      {/* 7. BLOGS */}
      {activeTab === 'blogs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-graphite-200">
            <div>
              <h3 className="font-bold text-graphite-900 text-sm">Journal & Blog Articles</h3>
              <p className="text-xs text-graphite-400">Publish and edit blog posts displayed on the website.</p>
            </div>
            <Button size="sm" onClick={() => { setEditingBlog(null); setIsBlogModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Journal Article
            </Button>
          </div>
          <Table
            columns={blogColumns}
            data={blogsData?.posts || []}
            keyExtractor={(row) => row.id}
            isLoading={blogsLoading}
            emptyMessage="No journal blog posts published."
          />
        </div>
      )}

      {/* 8. COLLECTIONS */}
      {activeTab === 'collections' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-graphite-200">
            <div>
              <h3 className="text-sm font-bold text-graphite-900">Collections & Category Taxonomy</h3>
              <p className="text-xs text-graphite-400">Manage collection names, descriptions, and cover images.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => { setEditingSubcategory(null); setIsSubcategoryModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Subcategory
              </Button>
              <Button size="sm" onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }}>
                <Plus className="h-4 w-4 mr-1" /> Add Main Category
              </Button>
            </div>
          </div>

          {categoriesLoading ? (
            <p className="py-8 text-center text-xs text-graphite-400">Loading category taxonomy...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {(categoriesData?.categories || []).map((cat) => (
                <div key={cat.id} className="rounded-xl border border-graphite-200 bg-white p-5 space-y-4 shadow-2xs">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-bold text-graphite-900 text-base">{cat.name}</span>
                      <p className="text-xs font-mono text-graphite-400">/{cat.slug}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                        className="p-1 rounded text-graphite-400 hover:text-graphite-700 hover:bg-graphite-100"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeletingCategory(cat)}
                        className="p-1 rounded text-red-400 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {cat.image && (
                    <div className="h-28 w-full rounded-lg bg-graphite-100 overflow-hidden border border-graphite-100">
                      <img src={cat.image} alt={cat.name} className="h-full w-full object-cover" />
                    </div>
                  )}

                  <div>
                    <h4 className="text-xs font-bold text-graphite-700 uppercase tracking-wider mb-2">Subcategories</h4>
                    <div className="space-y-1.5">
                      {!cat.subcategories || cat.subcategories.length === 0 ? (
                        <p className="text-xs text-graphite-400 italic">No subcategories defined.</p>
                      ) : (
                        cat.subcategories.map((sub) => (
                          <div key={sub.id} className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-graphite-50 border border-graphite-100">
                            <div>
                              <span className="font-medium text-graphite-800">{sub.name}</span>
                              <span className="text-[10px] text-graphite-400 ml-1.5 font-mono">/{sub.slug}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => { setEditingSubcategory({ ...sub, categoryId: cat.id }); setIsSubcategoryModalOpen(true); }}
                                className="p-0.5 rounded text-graphite-400 hover:text-graphite-700"
                              >
                                <Edit2 className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setDeletingSubcategory(sub)}
                                className="p-0.5 rounded text-red-400 hover:text-red-700"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 9. FAQS */}
      {activeTab === 'faqs' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-graphite-200">
            <div>
              <h3 className="font-bold text-graphite-900 text-sm">Frequently Asked Questions</h3>
              <p className="text-xs text-graphite-400">Manage questions and answers displayed across pages.</p>
            </div>
            <Button size="sm" onClick={() => { setEditingFaq(null); setIsFaqModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add FAQ Item
            </Button>
          </div>
          <Table
            columns={faqColumns}
            data={faqsData?.faqs || []}
            keyExtractor={(row) => row.id}
            isLoading={faqsLoading}
            emptyMessage="No FAQs created."
          />
        </div>
      )}

      {/* 10. REVIEWS */}
      {activeTab === 'reviews' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-graphite-200">
            <div>
              <h3 className="font-bold text-graphite-900 text-sm">Customer Reviews & Testimonials</h3>
              <p className="text-xs text-graphite-400">Moderate customer reviews shown on homepage & product pages.</p>
            </div>
            <Button size="sm" onClick={() => { setEditingReview(null); setIsReviewModalOpen(true); }}>
              <Plus className="h-4 w-4 mr-1" /> Add Customer Review
            </Button>
          </div>
          <Table
            columns={reviewColumns}
            data={reviewsData?.reviews || []}
            keyExtractor={(row) => row.id}
            isLoading={reviewsLoading}
            emptyMessage="No customer reviews submitted."
          />
        </div>
      )}

      {/* MODALS */}
      {isHeroModalOpen && (
        <HeroSlideModal
          slide={editingHero}
          isOpen={isHeroModalOpen}
          onClose={() => setIsHeroModalOpen(false)}
          onSaved={refetchHero}
        />
      )}

      {isReviewModalOpen && (
        <ReviewModal
          review={editingReview}
          isOpen={isReviewModalOpen}
          onClose={() => setIsReviewModalOpen(false)}
          onSaved={refetchReviews}
        />
      )}

      {isBlogModalOpen && (
        <BlogModal
          post={editingBlog}
          isOpen={isBlogModalOpen}
          onClose={() => setIsBlogModalOpen(false)}
          onSaved={refetchBlogs}
        />
      )}

      {isFaqModalOpen && (
        <FaqModal
          faq={editingFaq}
          categories={categoriesData?.categories || []}
          isOpen={isFaqModalOpen}
          onClose={() => setIsFaqModalOpen(false)}
          onSaved={refetchFaqs}
        />
      )}

      {isCategoryModalOpen && (
        <CategoryModal
          category={editingCategory}
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSaved={refetchCategories}
        />
      )}

      {isSubcategoryModalOpen && (
        <SubcategoryModal
          subcategory={editingSubcategory}
          categories={categoriesData?.categories || []}
          isOpen={isSubcategoryModalOpen}
          onClose={() => setIsSubcategoryModalOpen(false)}
          onSaved={refetchCategories}
        />
      )}

      {/* Confirm Deletion Dialogs */}
      <ConfirmDialog
        isOpen={!!deletingHero}
        onClose={() => setDeletingHero(null)}
        onConfirm={handleDeleteHero}
        title="Delete Hero Slide"
        message={`Are you sure you want to delete "${deletingHero?.title}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingReview}
        onClose={() => setDeletingReview(null)}
        onConfirm={handleDeleteReview}
        title="Delete Review"
        message={`Are you sure you want to delete review by "${deletingReview?.name}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingBlog}
        onClose={() => setDeletingBlog(null)}
        onConfirm={handleDeleteBlog}
        title="Delete Blog Article"
        message={`Are you sure you want to delete article "${deletingBlog?.title}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingFaq}
        onClose={() => setDeletingFaq(null)}
        onConfirm={handleDeleteFaq}
        title="Delete FAQ Item"
        message={`Are you sure you want to delete question "${deletingFaq?.question}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingCategory}
        onClose={() => setDeletingCategory(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Category"
        message={`Are you sure you want to delete category "${deletingCategory?.name}"?`}
        isLoading={isSubmitting}
      />

      <ConfirmDialog
        isOpen={!!deletingSubcategory}
        onClose={() => setDeletingSubcategory(null)}
        onConfirm={handleDeleteSubcategory}
        title="Delete Subcategory"
        message={`Are you sure you want to delete subcategory "${deletingSubcategory?.name}"?`}
        isLoading={isSubmitting}
      />
    </div>
  );
};

// ----------------------------------------------------
// 1. HOME PAGE CONTENT EDITOR
// ----------------------------------------------------
const HomePageEditor: React.FC<{
  settings: any;
  heroSlides: HeroSlide[];
  heroLoading: boolean;
  onAddSlide: () => void;
  onEditSlide: (slide: HeroSlide) => void;
  onDeleteSlide: (slide: HeroSlide) => void;
  onToggleSlideActive: (slide: HeroSlide) => void;
  onSaved: () => void;
}> = ({ settings, heroSlides, heroLoading, onAddSlide, onEditSlide, onDeleteSlide, onToggleSlideActive, onSaved }) => {
  const [videoHeading, setVideoHeading] = useState(settings?.diamondSectionHeading || 'Diamonds that don’t cost the Earth');
  const [videoBody, setVideoBody] = useState(settings?.diamondSectionBody || 'Grown under conditions that mirror the earth’s.');
  const [videoUrl, setVideoUrl] = useState(settings?.diamondSectionVideo || 'https://assets.mixkit.co/videos/preview/mixkit-jewelry-craftsman-polishing-a-ring-41546-large.mp4');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.diamondSectionHeading) setVideoHeading(settings.diamondSectionHeading);
      if (settings.diamondSectionBody) setVideoBody(settings.diamondSectionBody);
      if (settings.diamondSectionVideo) setVideoUrl(settings.diamondSectionVideo);
    }
  }, [settings]);

  const handleSaveVideoSection = async () => {
    setLoading(true);
    try {
      await apiClient.put('/settings', {
        diamondSectionHeading: videoHeading,
        diamondSectionBody: videoBody,
        diamondSectionVideo: videoUrl,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Slider Banners */}
      <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-graphite-900">HERO SECTION BANNERS</h3>
            <p className="text-xs text-graphite-500">Edit homepage hero banner images, headings, taglines, and call-to-action buttons.</p>
          </div>
          <Button size="sm" onClick={onAddSlide}>
            <Plus className="h-4 w-4 mr-1" /> Add Hero Slide
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {heroLoading ? (
            <p className="col-span-full py-4 text-center text-xs text-graphite-400">Loading hero slides...</p>
          ) : heroSlides.length === 0 ? (
            <p className="col-span-full py-4 text-center text-xs text-graphite-400 italic">No hero slides created yet.</p>
          ) : (
            heroSlides.map((slide) => (
              <div key={slide.id} className="rounded-xl border border-graphite-200 bg-white p-4 space-y-3 flex items-start gap-4 shadow-2xs">
                <div className="h-20 w-32 rounded-lg bg-graphite-100 overflow-hidden shrink-0 border border-graphite-200">
                  <img src={slide.image} alt={slide.title} className="h-full w-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-graphite-900 text-sm truncate">{slide.title}</p>
                  <p className="text-xs text-graphite-500 truncate">{slide.tagline || 'No tagline'}</p>
                  <p className="text-[11px] font-mono text-brand-700 mt-1">{slide.href}</p>
                  <div className="flex items-center gap-2 mt-3">
                    <StatusBadge status={slide.isActive ? 'ACTIVE' : 'INACTIVE'} />
                    <Button size="sm" variant="outline" onClick={() => onEditSlide(slide)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => onDeleteSlide(slide)}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Lab Diamonds Video Section */}
      <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900 mb-1">LAB DIAMONDS FEATURE SECTION</h3>
          <p className="text-xs text-graphite-500">Edit section heading, body text, and video asset link.</p>
        </div>

        <div className="space-y-4">
          <Input label="Section Heading" value={videoHeading} onChange={(e) => setVideoHeading(e.target.value)} />
          <div>
            <label className="block text-xs font-bold text-graphite-800 mb-1">Body Description</label>
            <textarea
              rows={3}
              value={videoBody}
              onChange={(e) => setVideoBody(e.target.value)}
              className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs text-graphite-900"
            />
          </div>
          <Input label="Video URL (MP4 / WebM)" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
        </div>

        <div className="pt-4 border-t border-graphite-100 flex justify-end">
          <Button size="sm" isLoading={loading} onClick={handleSaveVideoSection}>
            <Save className="h-4 w-4 mr-1.5" /> Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 2. ABOUT PAGE CONTENT EDITOR
// ----------------------------------------------------
const AboutPageContentEditor: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const res = await apiClient.get('/cms/pages/about');
        setPageData(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load About page', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/cms/pages/about', {
        title: pageData?.title || 'About Us',
        content: pageData?.content || {},
        isPublished: true,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-graphite-400">Loading About Page Content...</div>;

  const content = pageData?.content || {};

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-graphite-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900">About Page Visual Editor</h3>
          <p className="text-xs text-graphite-500">Edit headings, body copy, and section images for the About Us page.</p>
        </div>
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {/* Hero Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">HERO SECTION</h4>
        <Input
          label="Heading"
          value={content.hero?.title || 'Real Diamonds. Without the Weight.'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Body Text</label>
          <textarea
            rows={3}
            value={content.hero?.body || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, body: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
        <ImageUploader
          label="Hero Cover Image"
          aspectRatioGuidance="Recommended: Desktop 16:9"
          value={content.hero?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, image: url } } })}
        />
      </div>

      {/* Maths Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">BECAUSE THE MATHS STOPPED MAKING SENSE</h4>
        <Input
          label="Heading"
          value={content.maths?.title || 'Because the Maths Stopped Making Sense'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, maths: { ...content.maths, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Body Text</label>
          <textarea
            rows={5}
            value={content.maths?.body || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, maths: { ...content.maths, body: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
        <ImageUploader
          label="Section Image"
          aspectRatioGuidance="Recommended: 4:5 Portrait"
          value={content.maths?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, maths: { ...content.maths, image: url } } })}
        />
      </div>

      {/* Worn Not Stored Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">WORN, NOT STORED</h4>
        <Input
          label="Heading"
          value={content.worn?.title || 'Worn, Not Stored'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, worn: { ...content.worn, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Body Text</label>
          <textarea
            rows={4}
            value={content.worn?.body || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, worn: { ...content.worn, body: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
        <ImageUploader
          label="Section Image"
          aspectRatioGuidance="Recommended: 4:5 Portrait"
          value={content.worn?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, worn: { ...content.worn, image: url } } })}
        />
      </div>

      {/* Founders Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">FOUNDERS SECTION</h4>
        <Input
          label="Founders Heading"
          value={content.founder?.title || 'Built in Bangalore, by Two People Who Saw the Same Gap'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, founder: { ...content.founder, title: e.target.value } } })}
        />
        <ImageUploader
          label="Founders Image"
          aspectRatioGuidance="Recommended: 4:5 Portrait"
          value={content.founder?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, founder: { ...content.founder, image: url } } })}
        />
      </div>

      {/* Experience Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">THE HOUSE OF SEYA EXPERIENCE</h4>
        <Input
          label="Heading"
          value={content.experience?.title || 'The House of Seya Experience'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, experience: { ...content.experience, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Body Text</label>
          <textarea
            rows={4}
            value={content.experience?.body || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, experience: { ...content.experience, body: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
        <ImageUploader
          label="Section Image"
          aspectRatioGuidance="Recommended: 4:5 Portrait"
          value={content.experience?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, experience: { ...content.experience, image: url } } })}
        />
      </div>

      <div className="pt-4 border-t border-graphite-100 flex justify-end">
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 3. GIFTING PAGE CONTENT EDITOR
// ----------------------------------------------------
const GiftingPageContentEditor: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const res = await apiClient.get('/cms/pages/gifting');
        setPageData(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load Gifting page', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/cms/pages/gifting', {
        title: pageData?.title || 'Gifting',
        content: pageData?.content || {},
        isPublished: true,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-graphite-400">Loading Gifting Page...</div>;

  const content = pageData?.content || {};

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-graphite-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900">Gifting Page Visual Editor</h3>
          <p className="text-xs text-graphite-500">Edit titles, descriptions, and curation images for Gifting.</p>
        </div>
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {/* Hero Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">HERO SECTION</h4>
        <Input
          label="Tagline"
          value={content.hero?.tagline || 'FOR SOMEONE SPECIAL'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, tagline: e.target.value } } })}
        />
        <Input
          label="Heading"
          value={content.hero?.title || 'Gifts That Stay Constant'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, title: e.target.value } } })}
        />
        <ImageUploader
          label="Hero Image"
          aspectRatioGuidance="Recommended: 16:9 Landscape"
          value={content.hero?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, image: url } } })}
        />
      </div>

      {/* Ready to Ship */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">READY TO SHIP SECTION</h4>
        <Input
          label="Heading"
          value={content.readyToShip?.title || 'Need a Gift Urgently?'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, readyToShip: { ...content.readyToShip, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Body Description</label>
          <textarea
            rows={3}
            value={content.readyToShip?.body || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, readyToShip: { ...content.readyToShip, body: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
      </div>

      <div className="pt-4 border-t border-graphite-100 flex justify-end">
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 4. CUSTOMISE PAGE CONTENT EDITOR
// ----------------------------------------------------
const CustomisePageContentEditor: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const res = await apiClient.get('/cms/pages/customise');
        setPageData(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load Customise page', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/cms/pages/customise', {
        title: pageData?.title || 'Customise',
        content: pageData?.content || {},
        isPublished: true,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-graphite-400">Loading Customise Page...</div>;

  const content = pageData?.content || {};
  const steps = content.steps || [
    { step: 1, title: 'Choose Your Piece', description: 'Select your preferred jewelry piece.' },
    { step: 2, title: 'Choose Your Diamond', description: 'Select diamond carat and shape.' },
    { step: 3, title: 'Select Setting', description: 'Choose setting style.' },
    { step: 4, title: 'Personalisation', description: 'Add engraving or custom touches.' },
    { step: 5, title: 'Final Review', description: 'Review your bespoke creation.' },
  ];

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-graphite-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900">Customise Page Visual Editor</h3>
          <p className="text-xs text-graphite-500">Edit titles, descriptions, and wizard steps for Customise.</p>
        </div>
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      <div className="space-y-4">
        {steps.map((s: any, i: number) => (
          <div key={i} className="space-y-3 bg-graphite-50 p-4 rounded-xl border border-graphite-200">
            <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">STEP {i + 1}: {s.title}</h4>
            <Input
              label="Step Heading"
              value={s.title}
              onChange={(e) => {
                const updated = [...steps];
                updated[i].title = e.target.value;
                setPageData({ ...pageData, content: { ...content, steps: updated } });
              }}
            />
            <Input
              label="Step Description"
              value={s.description}
              onChange={(e) => {
                const updated = [...steps];
                updated[i].description = e.target.value;
                setPageData({ ...pageData, content: { ...content, steps: updated } });
              }}
            />
          </div>
        ))}
      </div>

      <div className="pt-4 border-t border-graphite-100 flex justify-end">
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 5. DIAMOND EDUCATION CONTENT EDITOR
// ----------------------------------------------------
const DiamondEducationContentEditor: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const res = await apiClient.get('/cms/pages/diamond-education');
        setPageData(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load Diamond Education page', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/cms/pages/diamond-education', {
        title: pageData?.title || 'Diamond Education',
        content: pageData?.content || {},
        isPublished: true,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-graphite-400">Loading Diamond Education...</div>;

  const content = pageData?.content || {};

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-graphite-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900">Diamond Education Visual Editor</h3>
          <p className="text-xs text-graphite-500">Edit guide headings, 4Cs descriptions, and educational images.</p>
        </div>
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {/* Hero Section */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">HERO SECTION</h4>
        <Input
          label="Guide Title"
          value={content.hero?.title || 'The Complete Diamond Guide'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, title: e.target.value } } })}
        />
        <ImageUploader
          label="Hero Banner Image"
          aspectRatioGuidance="Recommended: 16:9 Landscape"
          value={content.hero?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, image: url } } })}
        />
      </div>

      {/* What are Lab-Grown Diamonds */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">WHAT ARE LAB-GROWN DIAMONDS</h4>
        <Input
          label="Heading"
          value={content.whatAreLabGrown?.title || 'What Are Lab-Grown Diamonds?'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, whatAreLabGrown: { ...content.whatAreLabGrown, title: e.target.value } } })}
        />
        <div>
          <label className="block text-xs font-bold text-graphite-800 mb-1">Paragraph 1</label>
          <textarea
            rows={3}
            value={content.whatAreLabGrown?.p1 || ''}
            onChange={(e) => setPageData({ ...pageData, content: { ...content, whatAreLabGrown: { ...content.whatAreLabGrown, p1: e.target.value } } })}
            className="w-full rounded-lg border border-graphite-300 p-2.5 text-xs"
          />
        </div>
        <ImageUploader
          label="Section Image"
          aspectRatioGuidance="Recommended: 4:3"
          value={content.whatAreLabGrown?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, whatAreLabGrown: { ...content.whatAreLabGrown, image: url } } })}
        />
      </div>

      <div className="pt-4 border-t border-graphite-100 flex justify-end">
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// 6. GOLD VERMEIL CONTENT EDITOR
// ----------------------------------------------------
const GoldVermeilContentEditor: React.FC<{ onSaved: () => void }> = ({ onSaved }) => {
  const [pageData, setPageData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      try {
        const res = await apiClient.get('/cms/pages/gold-vermeil');
        setPageData(res.data.data || res.data);
      } catch (err) {
        console.error('Failed to load Gold Vermeil page', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiClient.put('/cms/pages/gold-vermeil', {
        title: pageData?.title || 'Gold Vermeil',
        content: pageData?.content || {},
        isPublished: true,
      });
      onSaved();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="py-8 text-center text-xs text-graphite-400">Loading Gold Vermeil...</div>;

  const content = pageData?.content || {};

  return (
    <div className="rounded-xl border border-graphite-200 bg-white p-6 space-y-6">
      <div className="flex items-center justify-between border-b border-graphite-100 pb-4">
        <div>
          <h3 className="text-sm font-bold text-graphite-900">Gold Vermeil Guide Editor</h3>
          <p className="text-xs text-graphite-500">Edit titles, text paragraphs, and images for the Gold Vermeil page.</p>
        </div>
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>

      {/* Hero */}
      <div className="space-y-4 bg-graphite-50 p-5 rounded-xl border border-graphite-200">
        <h4 className="text-xs font-bold uppercase tracking-wider text-brand-700">HERO SECTION</h4>
        <Input
          label="Title"
          value={content.hero?.title || 'The Complete Gold Vermeil Guide'}
          onChange={(e) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, title: e.target.value } } })}
        />
        <ImageUploader
          label="Hero Image"
          aspectRatioGuidance="Recommended: 16:9 Landscape"
          value={content.hero?.image || ''}
          onChange={(url) => setPageData({ ...pageData, content: { ...content, hero: { ...content.hero, image: url } } })}
        />
      </div>

      <div className="pt-4 border-t border-graphite-100 flex justify-end">
        <Button size="sm" isLoading={saving} onClick={handleSave}>
          <Save className="h-4 w-4 mr-1.5" /> Save Changes
        </Button>
      </div>
    </div>
  );
};

// ----------------------------------------------------
// MODAL COMPONENTS WITH IMAGE UPLOADER
// ----------------------------------------------------

const HeroSlideModal: React.FC<{ slide: HeroSlide | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ slide, isOpen, onClose, onSaved }) => {
  const [title, setTitle] = useState(slide?.title || '');
  const [tagline, setTagline] = useState(slide?.tagline || '');
  const [image, setImage] = useState(slide?.image || '');
  const [cta, setCta] = useState(slide?.cta || 'Shop Collection');
  const [href, setHref] = useState(slide?.href || '/shop');
  const [sortOrder, setSortOrder] = useState(slide?.sortOrder || 0);
  const [isActive, setIsActive] = useState(slide?.isActive ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { title, tagline, image, cta, href, sortOrder: Number(sortOrder), isActive };
    try {
      if (slide) {
        await apiClient.put(`/cms/hero-slides/${slide.id}`, payload);
      } else {
        await apiClient.post('/cms/hero-slides', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={slide ? 'Edit Hero Banner' : 'Add Hero Banner'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="Tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />

        <ImageUploader
          label="Hero Banner Image"
          aspectRatioGuidance="Recommended: Desktop 16:9 (1920 × 1080 px)"
          value={image}
          onChange={(url) => setImage(url)}
        />

        <div className="grid grid-cols-2 gap-3">
          <Input label="Button Text" value={cta} onChange={(e) => setCta(e.target.value)} />
          <Input label="Button Link" value={href} onChange={(e) => setHref(e.target.value)} required />
        </div>
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold text-graphite-700 cursor-pointer">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4" />
          <span>Active Banner</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Banner</Button>
        </div>
      </form>
    </Modal>
  );
};

const ReviewModal: React.FC<{ review: Review | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ review, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState(review?.name || '');
  const [location, setLocation] = useState(review?.location || '');
  const [quote, setQuote] = useState(review?.quote || '');
  const [rating, setRating] = useState(review?.rating || 5);
  const [productName, setProductName] = useState(review?.productName || '');
  const [verified, setVerified] = useState(review?.verified ?? true);
  const [isPublished, setIsPublished] = useState(review?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const payload = { name, location, quote, rating: Number(rating), productName, verified, isPublished };
    try {
      if (review) {
        await apiClient.put(`/cms/reviews/${review.id}`, payload);
      } else {
        await apiClient.post('/cms/reviews', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={review ? 'Edit Review' : 'Add Review'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Client Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <Input label="Product Name" value={productName} onChange={(e) => setProductName(e.target.value)} />
        <Select
          label="Rating (1-5 Stars)"
          value={String(rating)}
          onChange={(e) => setRating(Number(e.target.value))}
          options={[1, 2, 3, 4, 5].map((r) => ({ value: String(r), label: `${r} Stars` }))}
        />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Quote / Review</label>
          <textarea rows={3} value={quote} onChange={(e) => setQuote(e.target.value)} required className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="h-4 w-4" />
            <span>Verified Purchase</span>
          </label>
          <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
            <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
            <span>Published</span>
          </label>
        </div>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Review</Button>
        </div>
      </form>
    </Modal>
  );
};

const BlogModal: React.FC<{ post: BlogPost | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ post, isOpen, onClose, onSaved }) => {
  const [title, setTitle] = useState(post?.title || '');
  const [slug, setSlug] = useState(post?.slug || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [body, setBody] = useState(post?.body || '');
  const [imageUrl, setImageUrl] = useState(post?.imageUrl || '');
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const blogSlug = slug || title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { title, slug: blogSlug, excerpt, body, imageUrl, isPublished };
    try {
      if (post) {
        await apiClient.put(`/cms/blog-posts/${post.id}`, payload);
      } else {
        await apiClient.post('/cms/blog-posts', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={post ? 'Edit Journal Article' : 'Add Journal Article'} maxWidth="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

        <ImageUploader
          label="Article Cover Image"
          aspectRatioGuidance="Recommended: 16:9 (1200 × 675 px)"
          value={imageUrl}
          onChange={(url) => setImageUrl(url)}
        />

        <Input label="Excerpt" value={excerpt} onChange={(e) => setExcerpt(e.target.value)} />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Article Content Body</label>
          <textarea rows={6} value={body} onChange={(e) => setBody(e.target.value)} className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Publish Article</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Article</Button>
        </div>
      </form>
    </Modal>
  );
};

const FaqModal: React.FC<{ faq: FAQ | null; categories: ProductCategory[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ faq, isOpen, onClose, onSaved }) => {
  const [question, setQuestion] = useState(faq?.question || '');
  const [answer, setAnswer] = useState(faq?.answer || '');
  const [context, setContext] = useState(faq?.context || 'GENERAL');
  const [isPublished, setIsPublished] = useState(faq?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const categoriesRes = await apiClient.get('/cms/faq-categories');
    const existingCats = categoriesRes.data.data?.categories || categoriesRes.data?.categories || [];
    let catId = existingCats[0]?.id;
    if (!catId) {
      const newCat = await apiClient.post('/cms/faq-categories', { name: 'General' });
      catId = newCat.data.data?.id || newCat.data?.id;
    }

    const payload = { categoryId: catId, question, answer, context, isPublished };
    try {
      if (faq) {
        await apiClient.put(`/cms/faqs/${faq.id}`, payload);
      } else {
        await apiClient.post('/cms/faqs', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={faq ? 'Edit FAQ Item' : 'Add FAQ Item'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Question" value={question} onChange={(e) => setQuestion(e.target.value)} required />
        <Select
          label="Context / Section"
          value={context}
          onChange={(e) => setContext(e.target.value as any)}
          options={[
            { value: 'GENERAL', label: 'General' },
            { value: 'PRODUCT', label: 'Product' },
            { value: 'DIAMOND_EDUCATION', label: 'Diamond Education' },
            { value: 'CUSTOMISE', label: 'Customise' },
            { value: 'GIFTING', label: 'Gifting' },
            { value: 'COLLECTION', label: 'Collection' },
          ]}
        />
        <div>
          <label className="block text-xs font-semibold text-graphite-700 mb-1">Answer</label>
          <textarea rows={4} value={answer} onChange={(e) => setAnswer(e.target.value)} required className="w-full rounded-lg border p-2 text-xs" />
        </div>
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save FAQ</Button>
        </div>
      </form>
    </Modal>
  );
};

const CategoryModal: React.FC<{ category: ProductCategory | null; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ category, isOpen, onClose, onSaved }) => {
  const [name, setName] = useState(category?.name || '');
  const [slug, setSlug] = useState(category?.slug || '');
  const [image, setImage] = useState(category?.image || '');
  const [sortOrder, setSortOrder] = useState(category?.sortOrder || 0);
  const [isPublished, setIsPublished] = useState(category?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const catSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { name, slug: catSlug, image, sortOrder: Number(sortOrder), isPublished };
    try {
      if (category) {
        await apiClient.put(`/categories/${category.id}`, payload);
      } else {
        await apiClient.post('/categories', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={category ? 'Edit Category' : 'Add Category'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input label="Category Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />

        <ImageUploader
          label="Category Cover Image"
          aspectRatioGuidance="Recommended: 1:1 Square or 4:3"
          value={image}
          onChange={(url) => setImage(url)}
        />

        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Category</Button>
        </div>
      </form>
    </Modal>
  );
};

const SubcategoryModal: React.FC<{ subcategory: Subcategory | null; categories: ProductCategory[]; isOpen: boolean; onClose: () => void; onSaved: () => void }> = ({ subcategory, categories, isOpen, onClose, onSaved }) => {
  const [categoryId, setCategoryId] = useState(subcategory?.categoryId || categories[0]?.id || '');
  const [name, setName] = useState(subcategory?.name || '');
  const [slug, setSlug] = useState(subcategory?.slug || '');
  const [sortOrder, setSortOrder] = useState(subcategory?.sortOrder || 0);
  const [isPublished, setIsPublished] = useState(subcategory?.isPublished ?? true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const subSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const payload = { categoryId, name, slug: subSlug, sortOrder: Number(sortOrder), isPublished };
    try {
      if (subcategory) {
        await apiClient.put(`/categories/subcategories/${subcategory.id}`, payload);
      } else {
        await apiClient.post('/categories/subcategories', payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={subcategory ? 'Edit Subcategory' : 'Add Subcategory'}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Select
          label="Parent Category"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
          required
        />
        <Input label="Subcategory Name" value={name} onChange={(e) => setName(e.target.value)} required />
        <Input label="URL Slug" value={slug} onChange={(e) => setSlug(e.target.value)} />
        <Input label="Sort Order" type="number" value={sortOrder} onChange={(e) => setSortOrder(Number(e.target.value))} />
        <label className="flex items-center gap-2 text-xs font-semibold cursor-pointer">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="h-4 w-4" />
          <span>Published</span>
        </label>
        <div className="flex justify-end gap-2 pt-3 border-t">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>Cancel</Button>
          <Button type="submit" size="sm" isLoading={loading}>Save Subcategory</Button>
        </div>
      </form>
    </Modal>
  );
};
